import { Command } from "../command";
import { create } from "../utils";

Command.register({
    name: "create",
    alt: ["new"],
    defaultArgs: ["--with-demo"],
    options: [
        "*",
        {
            start: { standalone: true },
        },
    ],
    defaultOption: "addons",
    handler: create,
});
