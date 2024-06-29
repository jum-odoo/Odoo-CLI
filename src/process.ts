import { exec, spawn } from "child_process";
import { LocalError } from "./constants";
import { logger } from "./logger";

export interface SpawnOptions {
    ignoreFail: boolean;
}

const exit: typeof process.exit = (code) => {
    logger.debug(`<exit>:`, code);
    return process.exit(code);
};

const onExit = (code: number) => {
    logger.debug(
        `exit code`,
        code,
        `received: terminating process &`,
        children.length,
        `child processes`
    );

    while (children.length) {
        children.pop()!.kill();
    }
    if (code) {
        logger.info(`process terminated with code`, code);
    } else {
        logger.info(`process ended`);
    }
};

const children: ReturnType<typeof spawn>[] = [];

export async function execProcess(command: string): Promise<string> {
    logger.debug("<execProcess>:", command);
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                reject(error || stderr);
            }
            resolve(stdout.trim());
        });
    });
}

export function listenOnCloseEvents() {
    process.on("exit", onExit);

    process.on("SIGINT", exit); // CTRL+C
    process.on("SIGQUIT", exit); // Keyboard quit
    process.on("SIGTERM", exit); // `kill` command

    process.on("SIGUSR1", exit);
    process.on("SIGUSR2", exit);
}

export function spawnProcess(args: string[], options?: SpawnOptions) {
    logger.debug("<spawnProcess>", ...args);
    const { ignoreFail } = options || {};
    const command = args.shift() || "";
    const child = spawn(command, args, { stdio: ignoreFail ? "ignore" : "inherit" });
    child.stdout?.on("data", console.log);
    if (!ignoreFail) {
        child.stderr?.on("data", console.error);
    }
    children.push(child);
    return new Promise((resolve, reject) => {
        child.on("exit", (code) => {
            if (code && !ignoreFail) {
                throw new LocalError(`${JSON.stringify(command)} process exited with code ${code}`);
            }
            resolve(code);
        });
    });
}
