import { Command } from "../command";
import { create } from "../utils";

Command.register({
    name: "create",
    alt: ["new"],
    defaultArgs: ["--without-demo=False"],
    options: [
        "*",
        {
            start: { standalone: true },
        },
    ],
    defaultOption: "database",
    handler: create,
});
