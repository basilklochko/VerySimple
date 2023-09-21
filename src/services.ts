export class WsService {
    public initiator: any;
    public caller: any;
    private ws = null;

    constructor(_initiator: any) {
        this.initiator = _initiator;
    }

    public init(address: string): void {
        this.ws = new WebSocket(address);
    }

    public send(data: any): void {
        this.ws.send(data);
    }

    public listen(callback): void {
        const self = this;

        this.ws.onmessage = function (event) {
            self.initiator.initialLoad = true;
            callback(event);

        };
    }

    public bindElements(): void {
        this.initiator.bindElements(this.caller);
    }
}

export class HttpService {
    public initiator: any;
    public caller: any;

    constructor(_initiator: any) {
        this.initiator = _initiator;
    }

    public delete(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.onload = () => {
                resolve(xhr.response);
                this.initiator.initialLoad = true;
                setTimeout(() => this.initiator.bindElements(this.caller), 100);
            }
            xhr.onerror = () => reject(xhr.statusText);

            xhr.open("DELETE", url, true);
            xhr.send(null);
        });
    }

    public postJson(url: string, body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.onload = () => {
                resolve(xhr.response);
                this.initiator.initialLoad = true;
                setTimeout(() => this.initiator.bindElements(this.caller), 100);
            }
            xhr.onerror = () => reject(xhr.statusText);

            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.send(JSON.stringify(body));
        });
    }

    public putJson(url: string, body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.onload = () => {
                resolve(xhr.response);
                this.initiator.initialLoad = true;
                setTimeout(() => this.initiator.bindElements(this.caller), 100);
            }
            xhr.onerror = () => reject(xhr.statusText);

            xhr.open("PUT", url, true);
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.send(JSON.stringify(body));
        });
    }

    public getJson(url: string, body: any = null): Promise<any> {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.onload = () => {
                resolve(xhr.response);
                this.initiator.initialLoad = true;
                setTimeout(() => this.initiator.bindElements(this.caller), 100);
            }
            xhr.onerror = () => reject(xhr.statusText);

            xhr.open("GET", url);
            xhr.responseType = "json";
            xhr.send();
        });
    }

    public getText(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () => reject(xhr.statusText);

            xhr.open("GET", url);
            xhr.responseType = "text";
            xhr.send();
        });
    }
}

export class ComponentService {
    public initiator: any;
    public caller: any;

    constructor(_initiator: any) {
        this.initiator = _initiator;
    }

    public renderPartial(url: string, target: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getPartial(url).then((res) => {

                this.initiator.renderPartial(res, target);

                resolve(true);
            });
        });
    }

    public renderText(data: string, target: string): void {
        this.initiator.renderPartial(data, target);
    }

    public getPartial(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();

            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () => reject(xhr.statusText);

            xhr.open("GET", url);
            xhr.responseType = "document";
            xhr.send();
        });
    }
}