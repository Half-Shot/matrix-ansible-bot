import {default as cliArgs, OptionDefinition } from "command-line-args";
import {default as cliUsage, Section } from "command-line-usage";
import { Config } from "./config";
import { AnsibleHandler } from "./ansiblehandler";
import { MatrixHandler } from "./matrixhandler";

const OPTION_DEFS: OptionDefinition[] = [
    { name: "config", type: String, defaultValue: "config.yaml", alias: "c"},
    { name: "help", type: Boolean, alias: "h"},
];

const OPTIONS_USAGE: Section[] = [{
    header: "matrix-ansible-bot",
    content: "A matrix bot for doing all sorts of ansible operations",
  },
  {
    header: 'Options',
    optionList: OPTION_DEFS,
  }
];

interface Args {
    config: string;
    help: boolean;
}

const main = async () => {
    let config: Config;
    console.info("Started matrix-ansible-bot");
    const args = cliArgs(OPTION_DEFS) as Args;
    if (args.help) {
        console.log(cliUsage(OPTIONS_USAGE));
        return;
    }
    try {
        config = await Config.fromYamlFile(args.config);
    } catch (ex) {
        console.error(ex.message);
        throw Error("Could not load config file");
    }

    const ansibleHandler = new AnsibleHandler(config);
    const matrixHandler = new MatrixHandler(config.homeserver, ansibleHandler);
    await matrixHandler.start();
};

main().catch((ex) => {
    console.warn("Application encountered an error and has quit:", ex);
    process.exit(1);
});