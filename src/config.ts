import { default as yaml } from "js-yaml";
import { promises as fs } from "fs";

export interface IConfigHomeserver {
    url: string;
    storage: string;
    accessToken: string;
    adminUsers: string[];
}

interface IConfigAnsible {
    binary: string;
}

export interface IConfigPlaybook {
    location: string;
    gitautopull: boolean;
}

const DEFAULT_ANSIBLE: IConfigAnsible = {
    binary: "/usr/bin/ansible"
};

export class Config {

    public static async fromYamlFile(configPath: string): Promise<Config> {
        const yamlDoc = await fs.readFile(configPath, { encoding: "utf-8"});
        return new Config(yaml.safeLoad(yamlDoc));    
    }

    private _homeserver: IConfigHomeserver;
    private _ansible: IConfigAnsible;
    private _playbooks: {[key: string]: IConfigPlaybook};

    public get homeserver() {
        return this._homeserver;
    }

    public get ansible() {
        return this._ansible;
    }

    public getPlaybook(key: string) {
        return this._playbooks[key];
    }

    public getAllPlaybooks(){
        return this._playbooks;
    }

    constructor(doc: any) {
        this._homeserver = doc.homeserver;
        this._playbooks = doc.playbooks || [];
        this._ansible = doc.ansible || DEFAULT_ANSIBLE;
    }
}