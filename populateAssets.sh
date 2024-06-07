#!/bin/bash

mkdir -p public/assets/
mkdir -p public/assets/themes/default/assets/fonts/
cd public/assets

wget https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.6.0/socket.io.min.js -O socket.io.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.7.0/animate.min.css -O animate.css
wget https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js -O jquery.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js -O jquery-ui.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.js -O semantic.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.css -O semantic.min.css
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/themes/default/assets/fonts/icons.woff2 -O themes/default/assets/fonts/icons.woff2
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/themes/default/assets/fonts/icons.woff -O themes/default/assets/fonts/icons.woff
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/themes/default/assets/fonts/outline-icons.woff2 -O themes/default/assets/fonts/outline-icons.woff2
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/themes/default/assets/fonts/outline-icons.woff -O themes/default/assets/fonts/outline-icons.woff
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/themes/default/assets/fonts/brand-icons.woff2 -O themes/default/assets/fonts/brand-icons.woff2
wget https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/themes/default/assets/fonts/brand-icons.woff -O themes/default/assets/fonts/brand-icons.woff
wget https://cdnjs.cloudflare.com/ajax/libs/fabric.js/3.6.2/fabric.min.js -O fabric.min.js
wget https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js -O webfont.js
wget https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.6.2/flv.min.js -O flv.min.js
wget https://cdnjs.cloudflare.com/ajax/libs/jeditable.js/2.0.6/jquery.jeditable.min.js -O jquery.jeditable.min.js