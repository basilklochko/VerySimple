import { ComponentService, HttpService, WsService } from "./services";

export class VerySimple {
    private instanceRegistry: any = {};
    private wsService: WsService = new WsService(this);
    private httpService: HttpService = new HttpService(this);
    private componentService: ComponentService = new ComponentService(this);
    private sharedService: any = { id: "$SharedService" };

    public Start(): void {
        document.addEventListener("DOMContentLoaded", () => {
            this.loadPartials();
            this.bootstrap(document);
        }, false);
    }

    private bootstrap(root: any): void {
        let components: any = root.querySelectorAll(Declarations.componentAttr);

        for (let i: number = 0; i < components.length; i++) {
            let component = components[i].attributes[Declarations.componentAttr.replace("[", "").replace("]", "")].value;
            let id = component + "-" + i;

            let obj = new Function("return new " + component);

            try {
                obj();
                this.initComponent(components, component, i);
            }
            catch (e) {
                if (components[i].attributes[Declarations.srcAttr]) {
                    let src = components[i].attributes[Declarations.srcAttr].value;

                    var script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = src;
                    script.onload = () => {
                        this.initComponent(components, component, i);
                    };

                    document.head.appendChild(script);
                }
                else {
                    this.initComponent(components, component, i);
                }
            }
        }
    }

    private initComponent(components: any[], component: any, i: number): void {
        let f = new Function("component", "return new " + component);
        let instance = f(component);
        instance.id = Guid.NewGuid();

        components[i].setAttribute(Declarations.prefix + "id", instance.id);

        this.injectServices(instance);

        if (instance.$onComponentLoad != undefined) {
            instance.$onComponentLoad();

            for (let property in this.instanceRegistry) {
                var prop = this.instanceRegistry[property].instance;

                if (prop.id != "$SharedService" && prop.id != instance.id) {
                    this.bindElements(prop);
                }
            }
        }

        this.bindElements(instance);
    }

    private injectServices(instance: any): void {
        let initiator = this;

        for (var prop in instance) {
            switch (instance[prop]) {
                case "$SharedService":
                    instance[prop] = this.sharedService;
                    break;
                case "$WsService":
                    let wsService = new WsService(initiator);
                    wsService.caller = instance;
                    instance[prop] = wsService;
                    break;
                case "$HttpService":
                    let httpService = new HttpService(initiator);
                    httpService.caller = instance;
                    instance[prop] = httpService;
                    break;
                case "$ComponentService":
                    let componentService = new ComponentService(initiator);
                    componentService.caller = instance;
                    instance[prop] = componentService;
                    break;
            }
        }
    }

    private loadPartials(): void {
        let partials: any = document.querySelectorAll(Declarations.partialAttr);

        partials.forEach(partial => {
            let p = this.componentService.getPartial(partial.attributes[Declarations.partialAttr.replace("[", "").replace("]", "")].value);

            p.then((doc) => {
                this.processPartial(partial, doc);
            });
        });
    }

    public renderPartial(data: any, target: string): void {
        let partials: any = document.querySelectorAll("[" + Declarations.targetAttr + "='" + target + "']");

        partials.forEach(partial => {
            this.processPartial(partial, data);
        });
    }

    private processPartial(partial: any, data: any): void {
        partial.innerHTML = "";

        if (typeof data.querySelector === "function") {
            partial.insertAdjacentHTML("beforeend", data.querySelector("body").innerHTML);

            this.bootstrap(partial);
        }
        else {
            let pre = document.createElement("pre");
            let text = document.createTextNode(data);
            pre.appendChild(text);
            partial.appendChild(pre);
        }
    }

    public bindElements(instance: any): void {
        if (document.querySelector("[" + Declarations.prefix + "id" + "='" + instance.id + "']") == null) {
            delete this.instanceRegistry[instance.id];
            return;
        }

        let els: any = document.querySelector("[" + Declarations.prefix + "id" + "='" + instance.id + "']").getElementsByTagName("*");

        for (let i: number = 0; i < els.length; i++) {
            let parent = this.findElementComponent(els[i]);

            if (parent != undefined && parent.attributes[Declarations.prefix + "id"] != undefined && parent.attributes[Declarations.prefix + "id"].value == instance.id) {
                for (let j: number = 0; j < els[i].attributes.length; j++) {
                    if (!els[i].attributes[j]) {
                        continue;
                    }

                    if (els[i].attributes[j].name === Declarations.forAttr) {
                        this.bindFor(instance, els[i], j);
                    }

                    if (els[i].attributes[j].name === Declarations.modelAttr) {
                        this.bindModel(instance, els[i]);
                    }

                    if (els[i].attributes[j].name === Declarations.hideAttr) {
                        this.bindHide(instance, els[i], j);
                    }

                    if (els[i].attributes[j].name === Declarations.disabledAttr) {
                        this.bindDisabled(instance, els[i], j);
                    }

                    if (els[i].attributes[j].name === Declarations.classAttr) {
                        this.bindClass(instance, els[i], j);
                    }

                    if (els[i].attributes[j].name.indexOf(Declarations.eventStart) === 0) {
                        this.bindEvent(instance, els[i], j);
                    }
                }
            }
        }
    }

    private findElementComponent(element: Element): Element {
        let parent = element.parentElement;

        if (parent != null) {
            if (parent.attributes[Declarations.componentAttr.replace("[", "").replace("]", "")] == undefined) {
                return this.findElementComponent(parent);
            }
            else {
                return parent;
            }
        }
    }

    private bindFor(instance: any, element: Element, j: number): void {
        let forEach = element.attributes[j].value.split(" in ");

        let template = element.getElementsByClassName("vs-for-template");
        let html = "";

        if (template.length > 0) {
            html = template[0].innerHTML;

            while (element.lastChild != template[0]) {
                element.removeChild(element.lastChild);
            }
        }

        if (forEach.length === 2) {
            let name = forEach[0];
            let property = forEach[1];

            let arr = instance[property];

            if (arr.length > 0) {
                if (html.length > 0) {
                    element.insertAdjacentHTML("beforeend", html);

                    Array.prototype.forEach.call(element.getElementsByTagName("*"), child => {
                        child.removeAttribute(Declarations.boundAttr);
                    });
                }

                element.innerHTML = "<div vs-for-item>" + (html.length == 0 ? element.innerHTML : html) + "</div>";

                let sourceEl = element.firstElementChild;

                arr.forEach((item, index) => {
                    var cln = sourceEl.cloneNode(true);
                    let el = element.appendChild(cln) as Element;

                    var elements = el.getElementsByTagName("*");

                    Array.prototype.forEach.call(elements, elm => {
                        elm.removeAttribute(Declarations.boundAttr);

                        Array.prototype.forEach.call(elm.attributes, attribute => {
                            if (attribute.name == Declarations.modelAttr) {
                                Helper.setAttribute(elm, Declarations.modelAttr, property, index, name);
                            }
                            if (attribute.name.indexOf(Declarations.eventStart) == 0) {
                                let args = Helper.getArgs(attribute.value);
                                let evalArgs = args.replace(name, property + "[" + index + "]");
                                attribute.value = attribute.value.replace(args, evalArgs);
                            }
                            if (attribute.name == Declarations.disabledAttr) {
                                Helper.setAttribute(elm, Declarations.disabledAttr, property, index, name);
                            }
                            if (attribute.name == Declarations.hideAttr) {
                                Helper.setAttribute(elm, Declarations.hideAttr, property, index, name);
                            }
                        });
                    });
                });

                (sourceEl as any).classList.add("vs-for-template");
                (sourceEl as any).style.display = "none";
            }
        }
    }

    private bindHide(instance: any, element: any, j: number): void {
        let value = instance[element.attributes[j].value.replace("!", "")] == undefined ? false : instance[element.attributes[j].value.replace("!", "")];
        let property = element.attributes[j].value.replace("!", "");

        try {
            let e = new Function("instance", "return instance." + property);
            value = e(instance);

            if (element.attributes[j].value.indexOf("!") == 0) {
                value = !value;
                property = property.replace("!", "");
            }
        }
        catch (ex) {

        }

        if (value) {
            element.style.display = "none";
        } else {
            element.style.display = "";
        }

        this.addToInstanceRegistry(instance, property, element);
    }

    private bindDisabled(instance: any, element: any, j: number): void {
        let value = instance[element.attributes[j].value.replace("!", "")] == undefined ? false : instance[element.attributes[j].value.replace("!", "")];
        let property = element.attributes[j].value.replace("!", "");

        try {
            let e = new Function("instance", "return instance." + property);
            value = e(instance);

            if (element.attributes[j].value.indexOf("!") == 0) {
                value = !value;
                property = property.replace("!", "");
            }
        }
        catch (ex) {

        }

        if (value) {
            element.setAttribute("disabled", "disabled");
        } else {
            element.removeAttribute("disabled");
        }

        this.addToInstanceRegistry(instance, property, element);
    }

    private bindClass(instance: any, element: any, j: number): void {
        let value = instance[element.attributes[j].value.replace("!", "")] == undefined ? false : instance[element.attributes[j].value.replace("!", "")];

        let property = element.attributes[j].value;
        let entry = instance.constructor.name + "." + property;

        if (value.length == 0) {
            if (element.attributes[Declarations.classAttr + "-current"]) {
                element.classList.remove(element.attributes[Declarations.classAttr + "-current"].value);
            }
        } else {
            if (element.attributes[Declarations.classAttr + "-current"]) {
                element.classList.remove(element.attributes[Declarations.classAttr + "-current"].value);
            }

            value = value.replace("'", "").replace("'", "").replace("\"", "").replace("\"", "");

            element.setAttribute(Declarations.classAttr + "-current", value);
            element.classList.add(value);
        }

        this.addToInstanceRegistry(instance, property, element);
    }

    private bindModel(instance: any, element: Element): void {
        if (element.attributes[Declarations.modelAttr] == undefined) {
            return;
        }

        let property = element.attributes[Declarations.modelAttr].value;
        let entry = "";

        if (element.attributes[Declarations.modelAttr].value.indexOf("$SharedService.") == 0) {
            instance = this.sharedService;

            if (!this.sharedService[element.attributes[Declarations.modelAttr].value.replace("$SharedService.", "")]) {
                this.sharedService[element.attributes[Declarations.modelAttr].value.replace("$SharedService.", "")] = "";
            }

            entry = "this.sharedService." + property.replace("$SharedService.", "");
        }
        else {
            entry = instance.constructor.name + "." + property;
        }

        let value = this.evalModel(instance, element.attributes[Declarations.modelAttr].value);

        if (element["value"] != undefined) {
            element["value"] = value;

            if (!element.attributes[Declarations.boundAttr]) {
                if (!this.instanceRegistry[instance.id] || !this.instanceRegistry[instance.id][entry.replace(instance.constructor.name + ".", "")] || !this.instanceRegistry[instance.id][entry.replace(instance.constructor.name + ".", "")].elements.find(e => e == element)) {
                    element.addEventListener("keyup", () => {
                        this.bindModelValue(instance, element, value);
                    }, false);
                }
            }
        } else {
            if (value != undefined) {
                element.innerHTML = value;
            }
        }

        this.addToInstanceRegistry(instance, property, element);
    }

    private evalModel(instance: any, modelString: string): any {
        if (modelString.indexOf("$SharedService.") == 0) {
            return eval(modelString.replace("$SharedService.", "this.sharedService."));
        }
        else {
            try {
                let f = new Function("instance", "return instance." + modelString);
                return f(instance);
            }
            catch (ex) {
                return "";
            }
        }
    }

    private bindModelValue(instance: any, element: Element, value: any): void {
        if (element["value"] !== value) {
            this.assignProperty(instance, element.attributes[Declarations.modelAttr].value, element["value"]);
            this.syncModel(instance);
        }
    }

    private assignProperty(instance: any, property: string, value: any): any {
        if (property.indexOf("$SharedService.") == 0) {
            eval("this.sharedService." + property.replace("$SharedService.", "") + "=value");
        }
        else {
            let f = new Function("instance, value", "return instance." + property + "=value");
            return f(instance, value);
        }
    }

    private bindEvent(instance: any, element: Element, j: number): void {
        if (element.attributes[Declarations.boundAttr]) {
            return;
        }

        let entry = instance.constructor.name + "." + element.attributes[j].value;
        let argsString = Helper.getArgs(entry);

        element.addEventListener(element.attributes[j].name.toString().replace(Declarations.eventStart, ""), () => {
            let method = element.attributes[j].value.replace("(" + argsString + ")", "");
            let args = argsString.split(",");

            args.forEach((arg, index) => {
                if (arg.length > 0) {
                    try {
                        let p = new Function("instance", "return instance." + arg);
                        let res = p(instance);

                        if (res) {
                            args[index] = res;
                        }
                    }
                    catch (ex) {

                    }
                }
            });

            instance[method](args.join(","));

            this.bindElements(instance);

            for (let property in this.instanceRegistry) {
                for (let propName in this.instanceRegistry[property].instance) {
                    if (this.instanceRegistry[property].instance[propName] !== null && this.instanceRegistry[property].instance[propName].id && this.instanceRegistry[property].instance[propName].id == "$SharedService") {
                        this.bindElements(this.instanceRegistry[property].instance);
                    }
                }
            }
        }, false);

        (element as any).setAttribute(Declarations.boundAttr, "");
    }

    private addToInstanceRegistry(instance: any, property: string, element: Element): void {
        let instanceEntry = this.instanceRegistry[instance.id];

        property = property.replace("$SharedService.", "");

        if (instanceEntry == undefined) {
            this.instanceRegistry[instance.id] = {};
            this.instanceRegistry[instance.id].instance = instance;
        }

        if (this.instanceRegistry[instance.id][property] == undefined) {
            this.instanceRegistry[instance.id][property] = {};
        }

        if (this.instanceRegistry[instance.id][property].elements == undefined) {
            this.instanceRegistry[instance.id][property].elements = new Array<Element>();
        }

        if (!this.instanceRegistry[instance.id][property].elements.find(e => e == element)) {
            this.instanceRegistry[instance.id][property].elements.push(element);
        }
    }

    private syncModel(instance: any): void {
        for (let property in this.instanceRegistry[instance.id]) {
            if (property != "instance") {
                this.instanceRegistry[instance.id][property].elements.forEach(element => {
                    this.bindModel(instance, element);
                });
            }
        }
    }
}

export class Helper {
    public static setAttribute(modelEl: Element, attr: string, property: string, index: number, name: string): void {
        modelEl.setAttribute(attr, property + "[" + index + "]" + modelEl.attributes[attr].value.replace(name, ""));
    }

    public static getArgs(entry: string): string {
        return entry.substr(entry.lastIndexOf("(") + 1, entry.lastIndexOf(")") - entry.lastIndexOf("(") - 1);
    }
}

export class Declarations {
    public static prefix: string = "vs-";
    public static eventStart: string = Declarations.prefix + "event-";

    public static boundAttr: string = Declarations.prefix + "bound";

    public static partial = "partial";
    public static partialAttr = "[" + Declarations.prefix + Declarations.partial + "]";

    public static component = "component";
    public static componentAttr = "[" + Declarations.prefix + Declarations.component + "]";

    public static forAttr = Declarations.prefix + "for";
    public static forLoadedAttr = Declarations.prefix + "for-loaded";

    public static modelAttr = Declarations.prefix + "model";

    public static hideAttr = Declarations.prefix + "hide";
    public static disabledAttr = Declarations.prefix + "disabled";
    public static classAttr = Declarations.prefix + "class";

    public static targetAttr = Declarations.prefix + "target";

    public static srcAttr = Declarations.prefix + "src";
}

export class Guid {
    public static NewGuid(): string {
        let d = new Date().getTime();

        if (Date.now) {
            d = Date.now();
        }

        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

        return uuid;
    }
}

new VerySimple().Start();