# Info screen<sup>3</sup>

is useful tool when you need displaying same content to multiple locations or need to remotely control a slide show display.

Usage is very easy after you have setup the server at local network. The viewer is simply a web page so you need just computer with a browser to setup your displays.

# Features
* Can display easily slides from browser, you just need network connection, laptop with some browser
* Output resolution does not matter, all contents are automatically scaled from full hd or half-hd as source material.
* Slides:
    * Supports multiple screens/displays, for example info/kiosk and big and side screens can have different shows.
    * Has good text and image support, while background is shared per slide bundle
        * You can also have different image as background, just put custom image at editor to own layer
        * Slide can be as well only single image
    * Supports web content as slide, with custom scale factory
        * can be useful for timetables, tournament brackets... etc even pdf document loads
* Video support:
    * Slide background can has .mp4 embed video loop, half-hd preferably for performance.
    * It has Overlay/OnDemand layer for local obs live stream, supports sound as well, buffer delay about 2 seconds.
* Easy-to-use editor for slides with support of adding text and images to slide
* Finnish and English language support, sets automatically from browser language.
          
# Setup
1. run `npm install`
2. copy `config-default.js` to `config.js`
3. check config settings and if you don't need live stream support from local network using OBS, set `mediaServer` to `false`
4. run `npm start`
   - optionally you can start as a background task: `npm run-script daemon`, it will output just a pid for the new process and you find new files: `output.log` and `errors.log` at the `data` directory.

# Default usage
Viewer is located at: http://localhost:8000 <br/>
Admin interface is located at: http://localhost:8000/admin<br/>
Defaults to user: `admin`, pass: `admin`<br/>
It's highly encouraged to change the defaults to something else!

# Local stream support for OBS
> Works only when config has `mediaServer` set to `true` 

at OBS go to: `Settings` -> `Stream`<br/>
set following options:<br/>

|Setting|Value|
|:---|:---|
|Stream Type:| Custom Streaming Server|
|URL:| `rtmp://localhost/live`|
|Stream key:|`STREAM_NAME`|

# Mediaserver status and adminpanel
Admin interface is located at: http://localhost:8001/admin
You can use same crendetials as configured at main app


# Environment variables
|ENV|default|Usage|
|:---|:---|:---|
|PORT|8000|Server listen port|
|HOST|localhost|Host or ip from where to server is externally accessible|
|ADMIN_USER|admin|Username to access admin interface|
|ADMIN_PASS|admin|Password for the admin interface|

# Dockerfile

Dockerfile is provided for building a docker container. Docker container accepts the same ENV variables as the standard setup (see them above).

`docker build -t reaby/infoscreen .`<br/>
`docker run -p 8000:8000 -e HOST=infoscreen.lan -e PORT=8000 -e ADMIN_USER=admin -e ADMIN_PASS=secret --name infoscreen reaby/infoscreen`<br/>
