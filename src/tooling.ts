import { access, cp, readdir, readFile, rm, writeFile } from "fs/promises";
import { join, relative, sep } from "path";
import {
    ADDON_PATHS,
    COMMUNITY_PATH,
    ENTERPRISE_PATH,
    MANIFEST_FILE_NAME,
    ROOT_PATH,
    SRC_PATH,
} from "./constants";
import { logger } from "./logger";
import { $ } from "./process";

interface ToolingOptions {
    runTime?: "bun" | "npm";
}

function catchMissingFile<T extends (...args: any[]) => PromiseLike<any>>(fn: T) {
    return async function (...args: Parameters<T>) {
        try {
            await fn(...args);
        } catch (err: any) {
            if (err?.code === "ENOENT") {
                logger.warn("File not found:", err.message);
            } else {
                throw err;
            }
        }
    };
}

async function git(...args: Parameters<typeof String.raw>) {
    const command = String.raw(...args);
    await Promise.all([
        $`cd ${COMMUNITY_PATH} && git ${command}`,
        $`cd ${ENTERPRISE_PATH} && git ${command}`,
    ]);
}

function parseOptions(options: ToolingOptions | undefined) {
    if (options?.runTime) {
        switch (options.runTime) {
            case "bun": {
                jsRuntime = "bun";
                jsLockFile = "bun.lock";
                break;
            }
            case "npm": {
                jsRuntime = "npm";
                jsLockFile = "package.json";
                break;
            }
        }
    }
}

async function writeJsConfig(source: string, destination: string) {
    const formatRoots = (object: any, key: string) => {
        const initialList: string[] | undefined = object[key];
        if (!initialList) {
            return;
        }
        const list: string[] = [];
        for (const path of initialList) {
            const [prefix, ...pathParts] = path.split(sep);
            if (prefix.startsWith("*")) {
                list.push(join("**", ...pathParts));
            } else if (prefix === "addons") {
                list.push(join(relativeCommunity, ...pathParts));
            } else {
                list.push(path);
            }
        }
        object[key] = list;
    };

    const gatherPath = async (path: string) => {
        try {
            await access(join(path, MANIFEST_FILE_NAME));
        } catch {
            return;
        }
        pathEntries.push([
            join(`@${path.split(sep).at(-1)}`, "*"),
            [join(relative(ROOT_PATH, path), SRC_PATH, "*")],
        ]);
    };

    const gatherPaths = async (path: string) => {
        const items = await readdir(path);
        await Promise.all(items.map((item) => gatherPath(join(path, item))));
    };

    const file = await readFile(source, "utf-8");
    const config = JSON.parse(file);
    config.compilerOptions ||= {};

    const relativeCommunity = relative(ROOT_PATH, ADDON_PATHS.community);

    // Paths
    const pathEntries: [string, string[]][] = [];
    await Promise.all([gatherPaths(ADDON_PATHS.community), gatherPaths(ADDON_PATHS.enterprise)]);
    config.compilerOptions.paths = Object.fromEntries(
        pathEntries.sort((a, b) => a[0].localeCompare(b[0]))
    );

    // Type roots, include & exclude
    formatRoots(config.compilerOptions, "typeRoots");
    formatRoots(config, "exclude");
    formatRoots(config, "include");

    await writeFile(destination, JSON.stringify(config, null, 4), "utf-8");
}

async function _disable() {
    logger.info(`disabling git hooks in sub-folders`);
    await Promise.all([
        $`cd ${COMMUNITY_PATH} && git config --unset core.hooksPath`,
        $`cd ${ENTERPRISE_PATH} && git config --unset core.hooksPath`,
    ]);

    logger.info(`removing all tooling files from "${ROOT_PATH}"`);
    await Promise.all([
        remove(join(ROOT_PATH, ".eslintignore")),
        remove(join(ROOT_PATH, ".eslintrc.json")),
        remove(join(ROOT_PATH, "package.json")),
        remove(join(ROOT_PATH, jsLockFile)),
        remove(join(ROOT_PATH, "node_modules"), { recursive: true }),
        remove(join(ROOT_PATH, "jsconfig.json")),
        // Pre-commit hooks
        remove(join(COMMUNITY_PATH, HOOKS_FOLDER), { recursive: true }),
        remove(join(ENTERPRISE_PATH, HOOKS_FOLDER), { recursive: true }),
    ]);
}

async function _enable() {
    logger.info(`copying template files in "${ROOT_PATH}"`);
    await Promise.all([
        copy(join(TOOLING_PATH, "_eslintignore"), join(ROOT_PATH, ".eslintignore")),
        copy(join(TOOLING_PATH, "_eslintrc.json"), join(ROOT_PATH, ".eslintrc.json")),
        copy(join(TOOLING_PATH, "_package.json"), join(ROOT_PATH, "package.json")),
        writeJsConfig(join(TOOLING_PATH, "_jsconfig.json"), join(ROOT_PATH, "jsconfig.json")),
        // Pre-commit hooks
        copy(HOOKS_PATH, join(COMMUNITY_PATH, HOOKS_FOLDER), { recursive: true }),
        copy(HOOKS_PATH, join(ENTERPRISE_PATH, HOOKS_FOLDER), { recursive: true }),
    ]);

    logger.info(`setting git hooks in sub-folders to "${HOOKS_FOLDER}"`);
    await Promise.all([
        $`cd ${COMMUNITY_PATH} && git config core.hooksPath ${HOOKS_FOLDER}`,
        $`cd ${ENTERPRISE_PATH} && git config core.hooksPath ${HOOKS_FOLDER}`,
    ]);

    logger.info(`installing dependencies in "${ROOT_PATH}" with`, jsRuntime);
    await $`cd ${ROOT_PATH} && ${jsRuntime} install`;
}

const copy = catchMissingFile(cp);
const remove = catchMissingFile(rm);

const TOOLING_PATH = join(ADDON_PATHS.community, "web", "tooling");
const HOOKS_PATH = join(__dirname, "..", "hooks");
const HOOKS_FOLDER = ".hooks";

let jsRuntime = "bun";
let jsLockFile = "bun.lock";

export async function disable(options?: ToolingOptions) {
    parseOptions(options);
    await _disable();
    logger.info("tooling disabled");
}

export async function enable(options?: ToolingOptions) {
    parseOptions(options);
    await _enable();
    logger.info("tooling enabled");
}

export async function reload(options?: ToolingOptions) {
    parseOptions(options);
    await _disable();
    await _enable();
    logger.info("tooling reloaded");
}
