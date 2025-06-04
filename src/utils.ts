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

const _drop = async (command: Command, args: string[]) => {
    await spawnProcess(["dropdb", "-f", ...command.options.database.values], { ignoreFail: true });
};

const _start = async (command: Command, args: string[]) => {
    await spawnProcess(["python3", BIN_PATH, ...args]);
};

const R_BRANCH_DATABASE = /^(\d+\.\d|saas-\d+\.\d|master)/;

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
        await _start(command, args);
    } else {
        // Create
        await spawnProcess(["createdb", ...command.options.database.values], { ignoreFail: true });
    }
}

export async function drop(command: Command, args: string[]) {
    const dbName = command.options.database.values.join(" ");
    logger.info(`dropping database "${dbName}"`);
    await _drop(command, args);
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

export function resolve<T>(value: Resolver<T>): T | Promise<T> {
    return typeof value === "function" ? (value as () => T | Promise<T>)() : value;
}

export async function start(command: Command, args: string[]) {
    const dbName = command.options.database.values.join(" ");
    logger.info(`starting database "${dbName}"`);
    await _start(command, args);
}

export async function tooling(command: Command, args: string[]) {
    const mode = command.options.mode.values.join(" ");
    switch (mode) {
        case "disable":
        case "off": {
            return disable();
        }
        case "enable":
        case "on": {
            return enable();
        }
        default: {
            return reload();
        }
    }
}

export async function getDefaultDbName() {
    const branch = await $`cd ${COMMUNITY_PATH} && git rev-parse --abbrev-ref HEAD`;
    return [branch.match(R_BRANCH_DATABASE)?.[1] || "dev"];
}
