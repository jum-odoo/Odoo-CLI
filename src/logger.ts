import { isDebug } from "./constants";

const timestamp = () => new Date().toISOString().slice(11, 23);

const COLORS = {
    blue: "\x1b[34;1m",
    purple: "\x1b[35;20m",
    red: "\x1b[31;20m",
    reset: "\x1b[0m",
    yellow: "\x1b[33;20m",
};

class Logger {
    debug(...args: any[]) {
        isDebug() && console.debug(...Logger.logArgs("debug", "purple", ...args));
    }

    error(...args: any[]) {
        console.error(...Logger.logArgs("error", "red", ...args));
    }

    info(...args: any[]) {
        console.log(...Logger.logArgs("info", "blue", ...args));
    }

    warn(...args: any[]) {
        console.warn(...Logger.logArgs("warning", "yellow", ...args));
    }

    static logArgs(label: string, color: keyof typeof COLORS, ...args: any[]) {
        return [
            `${COLORS.reset}${timestamp()} ${COLORS[color]}[${label.toUpperCase()}]${COLORS.reset}`,
            ...args,
        ];
    }
}

export const logger = new Logger();
