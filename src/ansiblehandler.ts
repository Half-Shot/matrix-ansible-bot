import { Config, IConfigPlaybook } from "./config";
import { stat, statSync, readFileSync } from "fs";
import { dirname } from "path";
import { default as git } from "simple-git/promise";
import { PullResult } from "simple-git/typings/response";
import { spawn } from "child_process";
import ansibleparser, { IAnsibleLine } from "./ansibleparser";

export interface IOutcome {
    success: boolean;
    reason: string|null;
}

export interface IBuildOutcome extends IOutcome {
    pullResult: PullResult|null;
    status: string;
    currentRole: string|null;
    currentTask: string|null;
}

export class AnsibleHandler {
    constructor(private config: Config) {
        // Validate config
        const books = config.getAllPlaybooks();
        const pbKeyLen = Object.keys(books).length;
        if (pbKeyLen == 0) {
            throw Error("No playbooks defined in config, cannot start");
        }
        for (const playbookName of Object.keys(books)) {
            try {
                readFileSync(books[playbookName].location);
            } catch (ex) {
                throw Error(`Failed to load "${playbookName}":` + ex);
            }
        }
        console.log(`Loaded ${pbKeyLen} playbooks`);
    }

    public async onTriggerBuild(playbookName: string, progressCb: (progress: IBuildOutcome) => void ): Promise<IBuildOutcome> {
        const result: IBuildOutcome = {
            success: false,
            reason: null,
            pullResult: null,
            currentRole: null,
            currentTask: null,
            status: "pre",
        }
        const pBook = this.config.getPlaybook(playbookName);
        if (!pBook) {
            return { ...result, reason: "Playbook not configured"};
        }
        
        // Trigger a sync
        if (pBook.gitautopull) {
            try {
                result.pullResult = await git(dirname(pBook.location)).pull();
                progressCb({ ...result, status: "git pull"});
            } catch (ex) {
                 return { ...result, reason: "Git pull failed"};
            }
        }

        try {
            let currentRole = "";
            result.success = await this.ansibleBuild(pBook, (ansibleUpdate) => {
                console.log(ansibleUpdate);
                if (ansibleUpdate.action === "PLAY") {
                    progressCb({
                        ...result,
                        status: "Starting ansible",
                    });
                } else if (ansibleUpdate.action === "TASK" && ansibleUpdate.role !== undefined && currentRole != ansibleUpdate.role) {
                    currentRole = ansibleUpdate.role;
                    progressCb({
                        ...result,
                        status: `Running role ${currentRole}`,
                    });
                } else if (ansibleUpdate.action === "PLAY RECAP") {
                    progressCb({
                        ...result,
                        status: `Completed ansible run`,
                    });
                }
            });
        } catch (ex) {
            console.error("Ansible exited with an error", ex);
            result.success = false;
            result.reason = "Ansible exited with an error";
        }

        return {...result};
    }

    private ansibleBuild(playbook: IConfigPlaybook, onUpdate: (update: IAnsibleLine) => void): Promise<boolean> {
        const proc = spawn(this.config.ansible.binary, [
            playbook.location,
            "--check",
            "--verbose",
        ], { cwd: dirname(playbook.location) });
        return new Promise((resolve, reject) => {
            proc.on("close", () => {
                resolve(true);
            });
            proc.stdout.on("data", (data: Buffer) => {
                const t = ansibleparser.parseAnsibleLine(data);
                if (t) {
                    onUpdate(t);
                }
            })
            proc.on("error", reject);
        });
    }
}