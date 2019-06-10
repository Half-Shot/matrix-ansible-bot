import { IConfigHomeserver } from "./config";
import { MatrixClient, SimpleFsStorageProvider } from "matrix-bot-sdk";
import { AnsibleHandler } from "./ansiblehandler";

export class MatrixHandler {
    private client: MatrixClient;
    constructor(private config: IConfigHomeserver, private ansible: AnsibleHandler) {
        const storage = new SimpleFsStorageProvider(config.storage);
        this.client = new MatrixClient(config.url, config.accessToken, storage);
    }

    public async start() {
        this.client.on("room.invite", (roomId, event) => {
            const allowed = this.config.adminUsers.includes(event.sender);
            return this.client[allowed ? "joinRoom" : "leaveRoom"](roomId);
        });
        this.client.on("room.message", this.handleMessage.bind(this));
        await this.client.start();
    }

    private async handleMessage(roomId: string, event: any) {
        if (!event.content || !event.content.body) {
            return;
        }
        const parts = event.content.body.split(" ") as string[];
        if (parts[0] !== "!ansible") {
            return;
        }
        if (!this.config.adminUsers.includes(event.sender)){
            await this.client.sendNotice(roomId, "You are not allowed to use this bot");
            return;
        }
        if (parts[1] === "deploy") {
            const pbook = parts[2];
            if (!pbook) {
                await this.client.sendNotice(roomId, "You must specify a playbook to run");
            }
            const result = await this.ansible.onTriggerBuild(pbook, (progress) => {
                return this.client.sendMessage(roomId, {
                    msgtype: "m.notice",
                    formatted_body: `<font color="purple">PROGRESS:</font> ${progress.status}`,
                    format: "org.matrix.custom.html",
                    body: `PROGRESS: ${progress.status}`,
                });
            });
            if (!result.success) {
                await this.client.sendMessage(roomId, {
                    msgtype: "m.notice",
                    formatted_body: `<font color="red">ERROR:</font> ${result.reason}`,
                    format: "org.matrix.custom.html",
                    body: `ERROR: ${result.reason}`,
                });
            } else {
                await this.client.sendMessage(roomId, {
                    msgtype: "m.notice",
                    formatted_body: `<font color="green">OK:</font> Build completed`,
                    format: "org.matrix.custom.html",
                    body: `OK: Build completed`,
                });
            }
        }
    }
}