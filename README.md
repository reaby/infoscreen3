# Info screen<sup>3</sup>

is useful tool when you need displaying same content to multiple locations or need to remotely control a slide show display.

Usage is very easy after you have setup the server at local network. The viewer is simply a web page so you need just computer with a browser to setup your displays.

# Setup
1. npm install
2. copy `config-default.js` to `config.js`
3. check config settings and if you don't need local rtmp media server, set `mediaServer` to `false`
4. (edit `/data/meta.json`, add, remove or rename the displays you need or use the defaults)
5. npm start

# Default usage
Viewer is located at: http://localhost:8000 <br/>
Admin interface is located at: http://localhost:8000/admin<br/>
Defaults to user: `admin`, pass: `admin`<br/>
It's highly encouraged to change the defaults to something else!

# Lite viewer
Lite viewer is located at each display post fixed with `/lite`<br/>
Example: http://localhost:8000/display/0/lite <br/>

> notice: Lite viewer supports only .png images on slides! 
> backgrounds can be only jpg. 

# Local stream support for OBS
> Works only when config has `mediaServer` set to `true` 

Go to: `Settings` -> `Stream`<br/>
set following options:<br/>

|Setting|Value|
|:---|:---|
|Stream Type:| Custom Streaming Server|
|URL:| `rtmp://localhost/live`|
|Stream key:|`STREAM_NAME`|

Later it is possible to define other stream names/keys too, but for now only this one is supported.

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
