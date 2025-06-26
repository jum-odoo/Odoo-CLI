import { Command } from "../command";
import { database } from "../utils";

Command.register({
    name: "database",
    alt: ["db", "databases"],
    options: ["port"],
    handler: database,
});
