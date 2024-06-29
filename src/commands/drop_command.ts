import { Command } from "../command";
import { drop } from "../utils";

Command.register({
    name: "drop",
    options: [
        "debug",
        {
            database: {
                defaultValues: undefined,
                required: true,
            },
        },
    ],
    handler: drop,
});
