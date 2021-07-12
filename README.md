# PieBoard Client

To create a PieBoard:
1. Install Raspbian/Raspberry Pi OS Lite onto an SD card, and boot up the raspberry pi
2. run the `setup.sh` script. This will configure this device to be a PieBoard. The script will ask for a new password at first, but after that step no other input is needed.

*Note: This process modifies configuration files that makes the Pi Read-Only, PieBoard is only meant to run on dedicated devices!*

**Systems on PieBoard V1**: the v2 update has made many changes to how writing works on the SD Cards, the v2 update may install properly without any extra changes, however any benefits to SD Card longevity will not be applied without a re-install. Some elements on PieBoard may not work without the full re-install.