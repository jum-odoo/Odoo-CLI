import { Command } from "../command";
import { tooling } from "../utils";

Command.register({
    name: "tooling",
    options: [
        {
            mode: {
                required: true,
            },
        },
    ],
    defaultOption: "mode",
    handler: tooling,
});
