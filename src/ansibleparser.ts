const LINE_REGEX = /(PLAY RECAP|PLAY |TASK )(\[(.+)\])?/

type ACTIONS = "PLAY"|"TASK"|"PLAY RECAP";

export interface IAnsibleLine {
    action: ACTIONS,
    task: string|undefined,
    role: string|undefined,
}

export default class {
    public static parseAnsibleLine(buffer: Buffer): IAnsibleLine|null {
        const str = buffer.toString("utf-8").trim();
        const res = LINE_REGEX.exec(str);
        if (res == null) {
            return null;
        }
        let task = res[3];
        if (task && task.includes(":")) {
            const split = task.split(":");
            return {
                action: res[1]!.trim() as ACTIONS,
                role: split[0].trim(),
                task: split[1].trim(),
            }
        }
        if (task) {
            task = task.trim();
        }
        return {
            action: res[1]!.trim() as ACTIONS,
            task: task,
            role: undefined,
        };
    }
}