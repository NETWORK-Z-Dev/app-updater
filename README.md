# App Updater

The app updater was made for NodeJS to offer a way to automatically update an application FOR WINDOWS by downloading a setup file via url.

It requires a structure on the web server like below for it to properly function.

```shell
# /var/www/html/app
update.exe
version.txt
```

Here is an example specifically for electron on how to possibly implement this feature with some simple visuals:

```js
let updateCheck = await AppUpdater.check("https://dcts.community/app", { // no ending slash!
    includeOsUrl: true, // on windows, the url would become https://dcts.community/app-win32
})

// if available show prompt
if(updateCheck?.available){
    let result = await dialog.showMessageBox({
        type: "question",
        buttons: ["Update", "Not now"],
        defaultId: 0,
        cancelId: 1,
        title: "DCTS Client Update available",
        message: "It seems that a new version of the DCTS Client is available. Do you wanna download it?",
        detail: `Current Version: ${updateCheck?.current}\nAvailable Version: ${updateCheck?.remote}`
    });

    if(result.response === 0){
        let progressWindow = new BrowserWindow({
            width: 400,
            height: 160,
            resizable: false,
            minimizable: false,
            maximizable: false,
            autoHideMenuBar: true
        });

        await progressWindow.loadURL(`data:text/html,
            <body style="font-family:sans-serif;padding:20px;">
                <h3>DCTS Update</h3>
                <div id="status">Starting download...</div>
            </body>
        `);

        // this is where we actually download the file!!
        if(updateCheck?.downloadUrl){
            let file = await AppUpdater.downloadFile(
                updateCheck.downloadUrl,
                (data) => {
                    progressWindow.webContents.executeJavaScript(`
                        document.getElementById("status").innerText =
                            "Downloading... ${data.progress}%";
                    `);
                }
            );

            progressWindow.webContents.executeJavaScript(`
                document.getElementById("status").innerText =
                    "Finished: ${file.replaceAll("\\", "\\\\")}";
            `);
        }
    }
}
```

