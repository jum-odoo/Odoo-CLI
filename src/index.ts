import { Command } from "./command";
import { LocalError, R_FULL_MATCH, R_SHORT_MATCH } from "./constants";
import { logger } from "./logger";

import "./commands/index";
import { execProcess, listenOnCloseEvents } from "./process";

const main = async () => {
    listenOnCloseEvents();

    const processArgs = process.argv.slice(2).flatMap((arg) => arg.toLowerCase().split("="));
    const command = parseArguments(processArgs);

    await command.processOptions();

    logger.debug("debug logs active");

    // If the command requires a port: cleans up the given port
    if (command.options.port) {
        await stopProcessesOnPorts(command.options.port.values);
    }

    // Run command
    await command.run();
};

const parseArguments = (args: string[]) => {
    const remainingValues: string[] = [];
    const command = Command.find(args.shift() || "start");
    for (const arg of args) {
        let match;
        if ((match = arg.match(R_SHORT_MATCH))) {
            command.registerOption(match[1], "short");
        } else if ((match = arg.match(R_FULL_MATCH))) {
            command.registerOption(match[1], "long");
        } else {
            const lastOption = command.lastOption;
            if (lastOption?.acceptsValues) {
                lastOption.addValues(arg);
            } else {
                remainingValues.push(arg);
            }
        }
    }
    if (remainingValues.length) {
        if (!command.definition.defaultOption) {
            const strRemaining = remainingValues.map((o) => `"${o}"`).join(", ");
            throw new LocalError(
                `no default option for command '${command.definition.name}'; the following values were given without an option name: ${strRemaining}`
            );
        }
        const option = command.registerOption(command.definition.defaultOption, "long");
        option.addValues(...remainingValues);
    }
    return command;
};

const stopProcessesOnPorts = async (ports: string[]) => {
    const strPorts = [...ports].sort().join(",");
    try {
        await execProcess(`lsof -ti :${strPorts} | xargs kill -9`);
        logger.info(`terminated existing processes listening on port(s): ${strPorts}`);
    } catch {
        // Command failed: (probably) due to no pIds found
    }
};

try {
    await main();
} catch (err) {
    if (err instanceof LocalError) {
        // Errors caught by this script
        logger.error(err.message);
    } else {
        throw err;
    }
}
