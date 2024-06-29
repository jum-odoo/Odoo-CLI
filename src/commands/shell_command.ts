import { Command } from "../command";
import { start } from "../utils";

Command.register({
    name: "shell",
    alt: ["sh"],
    defaultArgs: ["shell"],
    options: [
        "*",
        {
            port: { defaultValues: ["8070"] },
        },
    ],
    defaultOption: "addons",
    handler: start,
});
