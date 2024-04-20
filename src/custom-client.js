"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomClient = void 0;
const discord_js_1 = require("discord.js");
class CustomClient extends discord_js_1.Client {
    constructor(clientOptions) {
        super(clientOptions);
    }
    setPresence(type, name, url) {
        return this.user?.setPresence({
            activities: [
                {
                    type,
                    name,
                    url,
                },
            ],
        });
    }
}
exports.CustomClient = CustomClient;
