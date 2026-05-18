import os from "os";
import packageJson from "./package.json" with {type: "json"};
import fs from "fs/promises";
import path from "path";

export default class AppUpdater {
    static async check(url, options = {
        includeOsUrl: false
    }) {
        console.log(options)
        if (!url) throw new Error("Oi ma'e no fockin url was provided! What da hell man?!")
        if (url?.endsWith("/")) throw new Error("The url isnt allowed to end with a '/' ffs!")
        if (!packageJson?.version) throw new Error("Package JSON doesnt seem to contain version info")

        let updateUrl = `${url}${options?.includeOsUrl ? `-${os.platform()}` : ""}/update.exe`;
        let versionUrl = `${url}${options?.includeOsUrl ? `-${os.platform()}` : ""}/version.txt`;

        if (!await this.isUrlAvailable(versionUrl)) throw new Error(`The version url wasnt found! ${versionUrl}`);
        if(!await this.isUrlAvailable(updateUrl)) throw new Error(`The update url wasnt found! ${updateUrl}`);

        // some parsing shit
        let remoteVersion = await this.getRemoteVersion(versionUrl);
        let parsedRemoteVersion = this.parseVersion(remoteVersion);
        let parsedCurrentVerion = this.parseVersion(packageJson.version);

        // looks like a new update is available!!
        if (parsedRemoteVersion && parsedCurrentVerion && parsedRemoteVersion > parsedCurrentVerion) {
            return {
                remote: remoteVersion,
                current: packageJson.version,
                downloadUrl: updateUrl,
                available: true,
            }
        }

        return {
            remote: remoteVersion,
            current: packageJson.version,
            downloadUrl: null,
            available: false,
        }
    }

    static parseVersion(versionString) {
        let parsed = Number(
            versionString
                ?.trim()
                ?.replaceAll(".", "")
        );

        if (isNaN(parsed)) return null;
        return parsed;
    }

    static async downloadFile(url, onProgress = null) {
        let response = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(30000)
        });

        if(response.status !== 200){
            throw new Error(`Failed to download file: ${url}`);
        }

        let total = Number(response.headers.get("content-length")) || 0;

        let filePath = path.join(os.tmpdir(), "update.exe");
        let fileHandle = await fs.open(filePath, "w");

        let downloaded = 0;

        for await (const chunk of response.body) {
            downloaded += chunk.length;

            await fileHandle.write(chunk);

            if(onProgress && total > 0){
                onProgress({
                    downloaded,
                    total,
                    progress: Math.round((downloaded / total) * 100),
                    path: filePath
                });
            }
        }

        await fileHandle.close();

        return filePath;
    }

    static async getRemoteVersion(url) {
        // check remote version
        let remoteVersion = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(2000)
        })

        if (remoteVersion.status === 200) {
            return (await remoteVersion.text()).trim()
        }

        return null;
    }

    static async isUrlAvailable(url) {
        let response = await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(2000)
        });

        return response.status === 200;
    }
}