# Info screen<sup>3</sup>
<a href="https://discord.gg/Ru59wMVDyd"><img alt="Discord" src="https://img.shields.io/discord/1173060772956479488?label=Discord&logo=discord&logoColor=fff"></a>&nbsp;
 ![GitHub Release Date - Published_At](https://img.shields.io/github/release-date/reaby/infoscreen3) &nbsp; ![GitHub last commit (branch)](https://img.shields.io/github/last-commit/reaby/infoscreen3/master)&nbsp;
 ![GitHub](https://img.shields.io/github/license/reaby/infoscreen3)

When you need to display same content to multiple locations or need to remotely control a slide show.

## Features
* Displays slide show in browser
* Uses Full HD 1920x1080 resolution internally
* Easy-to-use editor for slides. Supports adding easily text and image content
* The output resolution does not matter, all contents are automatically scaled from the Full HD source
* Finnish and English language support, sets automatically from browser language.
* Multiple renderers to choose from:
  1. WebGL (with 60+ changeable transitions)
  2. CSS3 (only blinds3D)
  3. Lite (only cross fade)
       *  in case your viewer laptop is totally a potato
* Content
  * Multiple screen locations, for example big screen may have different slide shows than kiosk -screen etc.
  * Webpages as slide + custom scaling of the content
    * can be useful for dynamic content like timetables, brackets and so on
  * Now with embedded Youtube video support (to have a 10h nyancat)
  * Supports mp4 video as a slide, in case you wish to run ads or democompo entry as a content slide.
  * Optional support for local RTMP Live streams, buffer delay is about 2 seconds.

## Setup
1. run `npm install`
2. copy `.env.example` to `.env`
3. run `npm start`
   - optionally you can start as a background task: `npm run-script daemon`, it will output just a pid for the new process and you find new files: `output.log` and `errors.log` at the `data` directory.

## Configuration

To access the infoscreen server outside from the localhost, like at LAN network, the config must be bind to external IP your server machine has. Configuration is set by environmental variables or by editing `.env` file.

If you wish to have live stream support at local network using OBS, set `MEDIASERVER` to `true` and set desired streamKey

You can run the server listen port as well the default http port `80`, but in that case you have to run the app with privileges with linux systems: `sudo npm start`

## Plugins

List of available plugins

| Plugin   | Description                                                                    |
| :------- | :----------------------------------------------------------------------------- |
| profiler | Outputs memory usage statistics at console                                     |
| overlay  | Change infoscreen to work as overlay to stream, by disabling background layers |
| ping     | Example plugin to display ping for local network machine.                      |

## Usage
Viewer is located at: http://localhost:8000<br>
Admin interface is located at: http://localhost:8000/admin<br/>

> for production it is highly encouraged to change admin credentials from the default!

| Username | default password |
| :------- | :--------------- |
| admin    | admin            |
| view     | view             |

## Local stream support for OBS
> Works only when config has `mediaServer` set to `true`

at OBS go to `Settings` -> `Stream`

| Setting            | Value                                              |
| :----------------- | :------------------------------------------------- |
| Service            | Custom...                                          |
| URL                | `rtmp://localhost/live`                            |
| Stream key         | config.streamKey value, defaults to: `INFOSCREEN3` |
| Use Authentication | *leave un-ticked*                                  |

### Note
Use only **baseline**-encoding for H.264, other options not works with the embedded javascript player

## Mediaserver admin panel
> if you have changed the default port from 8000 to something else, the correct port to access this feature is (config.serverListenPort+1)

Admin interface is located at: http://localhost:8001/admin
It accepts the same crendetials as configured at the main app.

## Environment variables
| ENV         | default     | Usage                                                 |
| :---------- | :--------   | :---------------------------------------------------- |
| PORT        | 8000        | Server listen port                                    |
| HOST        | localhost   | Host or ip, where the server is externally accessible |
| ADMIN_USER  | admin       | Username to access admin interface                    |
| ADMIN_PASS  | admin       | Password for the admin interface                      |
| USER        | view        | Username to access viewer                             |
| PASS        | view        | Password to access viewer                             |
| FRONT_PROXY | false       | Tell software that it's behind a front proxy          |
| DEBUG       | false       | whatever to debug... or not                           |
| SESSIONKEY  | predefined  | used to encrypt cookies                               |
| STREAMKEY   | INFOSCREEN3 | streamkey used at OBS                                 |
| MEDIASERVER | false       | use streaming feature                                 |
| LOCALE      | en          | available locales: en, fi                             |
| ACCESSKEY   | &lt;not set&gt;   | use accesskey to access views                   |
| GUARDRAILS  | '[{"line": [240, 0, 240, 1080]}, {"line": [1680, 0, 1680, 1080]}]'  | Adds additional guardrails into the grid editor. The defaults are for a 4:3 ratio allowing slides to be created for older projectors. In addition to the `line` property the provided json also takes optional input of the `stroke` color, `strokeWidth` width and `opacity` opacity of the guardrails |

To use access key edit the environment variable `ACCESSKEY=yourkey` to `.env`-file.
After you have set the access key you can use it like this:
http://127.0.0.1/display/0/lite?accesskey=yourkey<br>

## Dockerfile

Dockerfile is provided for building a docker container. <br>
Docker container accepts the same ENV variables from `.env`-file.

```bash
docker compose up -d --build
```

## Linux service

Service file for sysctl, provided by Hartsa (many thanks!)
Just edit the working directory of the script and change the user from root to yours, if needed.

```bash
sudo cp infoscreen.service /etc/systemd/system/
sudo systemctl start infoscreen.service
sudo systemctl enable infoscreen.service
```

If you need to see status of the service:

```bash
sudo systemctl status infoscreen.service
```

# Thanks
WebGL renderer bases upon initial working of [Creative WebGL Image Transitions](https://github.com/akella/webGLImageTransitions) repository here at github. Thanks for your awesome article.
