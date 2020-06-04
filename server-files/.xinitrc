xset s off         # don't activate screensaver
xset -dpms         # disable DPMS (Energy Star) features.
xset s noblank     # don't blank the video device
git clone https://github.com/Kings-Ridge-Christian-School/pieboard-client client; cd client; sudo git pull && sudo npm i && sudo npm start 
# everything has sudo because it seems to fail when it doesnt, will fix