import { Command } from "../command";
import { parseMemoryLogs } from "../memory_processing";

Command.register({
    name: "memory",
    alt: ["mem"],
    options: [
        {
            clear: {
                standalone: true,
            },
            csv: {
                standalone: true,
            },
            edit: {
                short: "e",
                standalone: true,
            },
            local: {
                short: "l",
                standalone: true,
            },
            ["logs-dir"]: {
                defaultValues: ["memory_data", "logs"],
            },
            metric: {
                defaultValues: ["used"], // accepted values: "time", "used", "total", "limit", "tests"
            },
            mobile: {
                short: "m",
                standalone: true,
            },
            mode: {
                defaultValues: ["parse"],
            },
            open: {
                short: "o",
                standalone: true,
            },
            ["output-dir"]: {
                defaultValues: ["memory_data", "output"],
            },
            sources: {
                defaultValues: ["memory_data", "data_sources.ini"],
            },
            variance: {
                short: "v",
                standalone: true,
            },
        },
    ],
    defaultOption: "mode",
    handler: parseMemoryLogs,
});
