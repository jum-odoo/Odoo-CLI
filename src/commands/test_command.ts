import { Command } from "../command";
import { start } from "../utils";

Command.register({
    name: "test",
    defaultArgs: ["--log-level", "test", "--stop-after-init", "--test-enable"],
    options: [
        "*",
        {
            tags: {
                alt: ["tag", "test-tags", "test-tag"],
                flag: "--test-tags",
                required: true,
            },
        },
    ],
    defaultOption: "tags",
    handler: start,
});
