import { Command } from "../command";
import { drop } from "../utils";

Command.register({
    name: "drop",
    options: ["database"],
    defaultOption: "database",
    handler: drop,
});
