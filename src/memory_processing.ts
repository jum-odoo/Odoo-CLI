import { readdir, readFile, rm, writeFile } from "fs/promises";
import { join, sep } from "path";
import { Command } from "./command";
import { LocalError } from "./constants";
import { logger } from "./logger";
import { $ } from "./process";

async function clearDirectories(...directories: string[]) {
    await Promise.all(
        directories.map(async (dir) => {
            const fileNames = await readdir(dir).catch(() => []);
            await Promise.all(
                fileNames.map((fname) => rm(join(dir, fname), { force: true, recursive: true }))
            );
        })
    );
}

async function editMemorySources(sourceFilePath: string) {
    try {
        await $`code ${sourceFilePath}`;
        return;
    } catch {}
    try {
        await $`codium ${sourceFilePath}`;
        return;
    } catch {}
    try {
        await $`nano ${sourceFilePath}`;
        return;
    } catch {}
}

async function fetchSourceContents(sources: [string, string][], logsDir: string) {
    return Promise.all(
        sources.map(async ([label, url]): Promise<[string, string]> => {
            if (R_URL.test(url)) {
                // Fetch source from URL
                logger.debug(`Fetching memory logs from URL:`, url);
                const dest = join(logsDir, labelToFileName(label));
                await $`wget -O ${dest} ${url}`;
                const content = await readFile(dest, "utf-8");
                return [label, content];
            } else {
                // Fetch source from file
                logger.debug(`Reading memory logs from file:`, url);
                const content = await readFile(url, "utf-8");
                return [label, content];
            }
        })
    );
}

function fileNameToLabel(fname: string) {
    const replaced = fname.replace(R_FILE_EXTENSION, "").replaceAll(R_UNDERSCORE, " ");
    return replaced[0].toUpperCase() + replaced.slice(1);
}

function labelToFileName(label: string) {
    return (
        label
            .trim()
            .toLowerCase()
            .replaceAll(R_ESCAPED_FILE_NAME_SEPARATOR, "_")
            .replaceAll(R_NON_ALPHANUM, "")
            .slice(0, 255) + ".txt"
    );
}

function parseSourceContents(
    sourceContents: [label: string, content: string][],
    options: {
        metric: string;
        showMobile?: boolean;
        variance?: boolean;
    }
) {
    if (!ACCEPTED_METRICS.includes(options.metric)) {
        throw new LocalError(
            `Unrecognized metric "${options.metric}": accepted metrics are ${ACCEPTED_METRICS.join(
                ", "
            )}`
        );
    }
    const data: Record<string, [label: string, value: number][]> = {};
    for (const [label, content] of sourceContents) {
        // Prepare source content
        const formattedContent = content
            .replaceAll(/(^.*?\[MEMINFO\] @.*$\n)|(^.*$\n)/gm, "$1")
            .replaceAll(/[,"]/gm, "")
            .replaceAll(R_MEMINFO, `$<label>,$<${options.metric}>,$<suite>`);

        // Map & filter rows
        const rows: [label: string, value: number][] = [];
        let timeRef = 0;
        let prevValue = 0;
        for (const line of formattedContent.split("\n")) {
            let [suiteLabel, value, suite] = line.split(",");
            if (!suiteLabel || !value) {
                continue;
            }
            if (suite === MOBILE_SUITE) {
                if (!options.showMobile) {
                    continue;
                }
                suiteLabel = `${suiteLabel} (mobile)`;
            }
            let parsedValue: number;
            if (options.metric === "time") {
                const ts = getSqlTimeStamp(value);
                if (timeRef) {
                    parsedValue = ts - timeRef;
                } else {
                    timeRef = ts;
                    parsedValue = 0;
                }
            } else {
                parsedValue = Number(value);
            }
            if (options.variance) {
                if (prevValue) {
                    [parsedValue, prevValue] = [Math.abs(parsedValue - prevValue), parsedValue];
                } else {
                    prevValue = parsedValue;
                    parsedValue = 0;
                }
            }
            rows.push([suiteLabel, parsedValue]);
        }
        if (rows.length) {
            logger.debug("Got", rows.length, "memory reading from source:", label);
        } else {
            logger.warn(`Memory log source`, label, `is empty`);
        }
        data[label] = rows;
    }
    return data;
}

/**
 * Get source paths from a source file
 * @param sourceFilePath
 */
async function parseSourceFile(sourceFilePath: string) {
    const sourceContent = await readFile(sourceFilePath, "utf-8");
    const sources: Record<string, string> = {};
    for (const line of sourceContent.split("\n")) {
        const buildSpec = line.trim();
        if (!buildSpec || R_SOURCE_COMMENT.test(buildSpec)) {
            continue;
        }
        let [label, ...urlParts] = buildSpec.split(R_LABEL_SEPARATOR);
        let url: string;
        if (urlParts.length) {
            url = urlParts.join("=");
        } else {
            url = label;
            label = "";
        }
        if (!label) {
            const buildNameMatch = url.match(R_BUILD_NAME);
            if (buildNameMatch) {
                label = buildNameMatch[1];
            } else {
                const urlSep = url.includes(sep) ? sep : "/";
                label = url.split(urlSep).at(-1) || "";
            }
        }
        label ||= `Build url #${Object.keys(sources).length + 1}`;
        sources[unquote(label)] = url;
    }
    return sources;
}

function getSqlTimeStamp(value: string) {
    const [date, time] = value.trim().split(/\s+/);
    const [h, m, _s] = time.split(":");
    const s = _s.slice(0, 2);
    const ms = _s.slice(2).padEnd(3, "0");

    const isoString = `${date}T${h}:${m}:${s}.${ms}`;

    return Number(new Date(isoString));
}

function unquote(string: string) {
    return R_DOUBLE_QUOTES.test(string) || R_SINGLE_QUOTES.test(string)
        ? string.slice(1, -1)
        : string;
}

const ACCEPTED_METRICS = ["time", "used", "total", "limit", "tests"];
const MOBILE_SUITE = ".MobileWebSuite";

const R_BUILD_NAME = /build\/(.*)\/logs/g;
const R_DOUBLE_QUOTES = /^".*"$/;
const R_ESCAPED_FILE_NAME_SEPARATOR = /[\s.\/:;#@-]+/g;
const R_FILE_EXTENSION = /\.\w+$/;
const R_LABEL_SEPARATOR = /\s*=\s*/;
const R_MEMINFO =
    /(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d+(,\d+)?).*(?<suite>\.(Mobile)?WebSuite).*: \[MEMINFO\] (?<label>.+) \(after GC\) - used: (?<used>\d+) - total: (?<total>\d+) - limit: (?<limit>\d+)( - tests: (?<tests>\d+))?.*/gm;
const R_NON_ALPHANUM = /\W/g;
const R_SINGLE_QUOTES = /^'.*'$/;
const R_SOURCE_COMMENT = /^[#;]/;
const R_UNDERSCORE = /_+/g;
const R_URL = /^https?:\/\//;

export async function parseMemoryLogs({ options }: Command, args: string[]) {
    const logsDir = join(__dirname, "..", ...options["logs-dir"].values);
    const outputDir = join(__dirname, "..", ...options["output-dir"].values);
    const sourceFilePath = join(__dirname, "..", ...options.sources.values);
    switch (options.mode.values[0]) {
        case "clear": {
            logger.info("Clearing local memory logs & data outputs");
            return clearDirectories(logsDir, outputDir);
        }
        case "edit": {
            logger.info("Opening source file for editing");
            return editMemorySources(sourceFilePath);
        }
        case "parse": {
            break;
        }
        default: {
            throw new LocalError(
                `unknown mode for memory parsing: ${options.mode.values.join(", ")}`
            );
        }
    }

    // Get source URLs from local logs or data source file
    let sourceEntries: [string, string][] = [];
    if (options.local) {
        logger.debug(`Reading memory logs from logs folder`);
        const fileNames = await readdir(logsDir).catch(() => []);
        for (const fname of fileNames) {
            sourceEntries.push([fileNameToLabel(fname), join(logsDir, fname)]);
        }
    } else {
        logger.debug(`Reading memory logs from source file`);
        const sources = await parseSourceFile(sourceFilePath);
        sourceEntries = Object.entries(sources);
    }

    if (!sourceEntries.length) {
        throw new LocalError(`Failed to parse: no sources specified in ${sourceFilePath}`);
    }

    // Fetch file sources (remotely or locally)
    logger.info("Parsing memory data from", sourceEntries.length, "sources");
    const sourceContents = await fetchSourceContents(sourceEntries, logsDir);
    const data = parseSourceContents(sourceContents, {
        metric: options.metric.values[0],
        showMobile: !!options.mobile,
        variance: !!options.variance,
    });

    // generate csv and json file
    const csv: Record<string, string[]> = {};
    if (options.csv) {
        csv["Suite"] = Object.keys(data);
    }
    const jsonData: Record<string, Record<string, number>> = {};
    for (const [label, rows] of Object.entries(data)) {
        for (const row of rows) {
            const [suite, value] = row;
            jsonData[suite] ||= {};
            jsonData[suite][label] = value;
            if (options.csv) {
                csv[suite] ||= [];
                csv[suite].push(String(value));
            }
        }
    }
    const jsonDataList = Object.entries(jsonData).map(([suite, data]) => ({ suite, ...data }));
    const stringifiedData = JSON.stringify(jsonDataList, null, 4);
    const jsDest = join(outputDir, "data.js");
    const jsContent = /* js */ `((win) => { win.LOG_DATA = ${stringifiedData}; })(window.top);`;
    logger.debug("Writing JS data to:", jsDest);
    const promises = [writeFile(jsDest, jsContent, "utf-8")];
    if (options.csv) {
        const csvDest = join(outputDir, "data.csv");
        logger.info("Writing CSV data to:", csvDest);
        const strCsv = Object.entries(csv)
            .map(([firstCol, columns]) => [firstCol, ...columns].join(","))
            .join("\n");
        promises.push(writeFile(csvDest, strCsv, "utf-8"));
    }
    logger.debug("Writing output files to folder:", outputDir);
    await Promise.all(promises);

    if (options.open) {
        logger.info("Opening graph view in browser");
        await $`open ${join(__dirname, "..", "memory_data", "index.html")}`;
    }
}
