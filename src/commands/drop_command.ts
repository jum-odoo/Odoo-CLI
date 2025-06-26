import { Command } from "../command";
import { drop } from "../utils";

Command.register({
    name: "drop",
    options: [
        {
            database: {
                defaultValues: undefined,
                required: true,
            },
        },
    ],
    defaultOption: "database",
    handler: drop,
});
