import { readdir, stat } from "fs/promises";
import { join } from "path";
import { type Command } from "./command";
import {
    ADDON_PACKS,
    ADDON_PATHS,
    BIN_PATH,
    COMMUNITY_PATH,
    LocalError,
    MANIFEST_FILE_NAME,
    R_VALID_MODULE_NAME,
} from "./constants";
import { logger } from "./logger";
import { $, spawnProcess } from "./process";
import { disable, enable, reload } from "./tooling";

export type Resolver<T> = T | (() => T | PromiseLike<T>);

const getPathModules = async (path: string) => {
    const pathModules: Set<string> = new Set();
    const items = await readdir(path);
    await Promise.all(
        items.map(async (item) => {
            if (!R_VALID_MODULE_NAME.test(item)) {
                return; // invalid module name
            }
            const fullItemPath = join(path, item);
            const itemStat = await stat(fullItemPath);
            if (!itemStat.isDirectory()) {
                return; // not a directory
            }
            const itemContent = await readdir(fullItemPath);
            if (!itemContent.includes(MANIFEST_FILE_NAME)) {
                return; // no manifest
            }
            pathModules.add(item);
        })
    );
    return [...pathModules].sort();
};

const getValidAddons = async () => {
    let values = Object.values(registeredModules);
    if (!values.length) {
        await Promise.all(
            Object.values(ADDON_PATHS).map(async (path) => {
                registeredModules[path] = await getPathModules(path);
            })
        );
        values = Object.values(registeredModules);
    }
    return values.flat();
};

const warnError = (error: any) => logger.warn(formatError(error));

const _drop = async (command: Command, args: string[]) => {
    const dbNames = command.options.database.values;
    await Promise.all(dbNames.map((dbName) => $`dropdb -f ${dbName}`.catch(warnError)));
};

const _start = (command: Command, args: string[]) => {
    spawnProcess(["python3", BIN_PATH, ...args]);
};

const R_BRANCH_DATABASE = /^(\d+\.\d|saas-\d+\.\d|master)/;
const R_WHITE_SPACE = /\s+/g;

const DOUBLE_QUOTES = `"`;
const SINGLE_QUOTE = "'";
const BACKTICK = "`";

const registeredModules: Record<string, string[]> = Object.create(null);

export async function create(command: Command, args: string[]) {
    const dbName = command.options.database.values.join(" ");
    logger.info(
        `creating new database "${dbName}" (${
            command.options.start ? "with" : "without"
        } auto-start)`
    );
    // Drop
    await _drop(command, args);
    if (command.options.start) {
        // Autostart
        _start(command, args);
    } else {
        // Create
        await $`createdb ${command.options.database.values.join(" ")}`.catch(warnError);
    }
}

export async function database(command: Command, args: string[]) {
    const port = command.options.port.values.join(" ");
    _start(command, args);
    logger.info("Opening database manager");
    await $`open http://127.0.0.1:${port}/web/database/manager`;
}

export async function drop(command: Command, args: string[]) {
    const dbNames = command.options.database.values.map(stringify);
    logger.info(`dropping ${plural("database", dbNames.length)} ${dbNames.join(", ")}`);
    await _drop(command, args);
}

export function formatError(error: Error | string | null) {
    let message: string;
    if (error instanceof Error) {
        message = String(error.message);
    } else {
        message = String(error ?? "error");
    }
    return message
        .split("\n")
        .map((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("Command failed:")) {
                return "";
            } else {
                return trimmedLine.replaceAll(R_WHITE_SPACE, " ");
            }
        })
        .filter(Boolean)
        .join("\n");
}

export async function parseAddons(addonsValue: string[]) {
    const addons: string[] = [];
    const invalidAddons = [];
    const validAddons = await getValidAddons();
    for (const addon of addonsValue.flatMap((v) => v.trim().split(/\s*,\s*/g))) {
        if (addon === "all") {
            return validAddons.filter(
                (addon) => !addon.startsWith("l10n_") || addon.startsWith("l10n_be")
            );
        }
        const addedModules = addon in ADDON_PACKS ? ADDON_PACKS[addon] : [addon];
        for (const addon of addedModules) {
            if (validAddons.includes(addon)) {
                addons.push(addon);
            } else {
                invalidAddons.push(addon);
            }
        }
    }
    if (invalidAddons.length) {
        logger.info(registeredModules);
        throw new LocalError(
            `Invalid addons: ${invalidAddons.map((addon) => JSON.stringify(addon)).join(", ")}`
        );
    }
    return addons;
}

export function plural(word: string, count: number, suffix = "s") {
    return count === 1 ? word : word + suffix;
}

export function resolve<T>(value: Resolver<T>): T | Promise<T> {
    return typeof value === "function" ? (value as () => T | Promise<T>)() : value;
}

export async function start(command: Command, args: string[]) {
    const dbName = command.options.database.values.join(" ");
    logger.info(`starting database "${dbName}"`);
    _start(command, args);
}

export function stringify(value: any) {
    const strValue = String(value);
    if (strValue.includes(DOUBLE_QUOTES)) {
        if (strValue.includes(SINGLE_QUOTE)) {
            return BACKTICK + strValue + BACKTICK;
        }
        return SINGLE_QUOTE + strValue + SINGLE_QUOTE;
    }
    return DOUBLE_QUOTES + strValue + DOUBLE_QUOTES;
}

export async function tooling(command: Command, args: string[]) {
    const mode = command.options.mode.values.join(" ");
    switch (mode) {
        case "disable":
        case "off": {
            await disable();
            break;
        }
        case "enable":
        case "on": {
            await enable();
            break;
        }
        default: {
            await reload();
            break;
        }
    }
}

export async function getDefaultDbName() {
    const branch = await $`cd ${COMMUNITY_PATH} && git rev-parse --abbrev-ref HEAD`;
    return [branch.match(R_BRANCH_DATABASE)?.[1] || "dev"];
}
