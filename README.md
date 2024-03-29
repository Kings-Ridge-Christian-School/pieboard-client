# PieBoard Client

### To create a PieBoard
1. Download Raspberry Pi OS Lite from the [Raspberry Pi Website](https://www.raspberrypi.org/software/operating-systems/)
   * Tested with `https://downloads.raspberrypi.org/raspios_lite_armhf/images/raspios_lite_armhf-2021-05-28/`
3. Write the image to a micro SD card, documentation for different operating systems can be found on the [Raspberry Pi Website](https://www.raspberrypi.org/documentation/installation/installing-images/)
4. Insert the SD card into your Raspberry Pi, it is recommended you also install a case and cooler on the Pi
5. Connect the Pi to the internet, whether that be over ethernet or [Wi-Fi](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md)
6. Download the [setup.sh](https://raw.githubusercontent.com/Kings-Ridge-Christian-School/pieboard-client/master/setup.sh) file provided in this repository. (wget recommended, do NOT clone the repository)
    * `wget https://go.kingsridgecs.org/digsig --output-document=setup.sh`
7. make the file executable, `chmod +x setup.sh`
8. run the file, `./setup.sh`
9. the default password is `raspberry`, this will prompt you to change it
10. after the password is changed, the device will automatically reconfigure and reboot
11. after the reboot, you should be greeted by the PieBoard setup screen, if not, you may need to redo the setup process
12. The interface will list a code and device IP addresses, access your [Pieboard Server](https://github.com/kings-ridge-christian-school/pieboard-server) over the [Pieboard Interface](https://github.com/kings-ridge-christian-school/pieboard-interface) configured seperately
13. Add a new device (Device dropdown > New)
14. Type the IP address and Device Code shown and hit setup.
15. If successful, the device will be added and you can now push updates. If this process failed, your network may be misconfigured or the device had an error. Check the PieBoard Server logs and the device logs, this can be done by attaching a keyboard and entering Ctrl+Q, or by killing the process over SSH and running `pkill electron`)
    
*Note: Device clocks may become desynced after a period of time, a cron job may need to be configured to update the times.*

*Note: This process modifies configuration files that makes the Pi Read-Only, PieBoard is only meant to run on dedicated devices!*

**Systems on PieBoard V1**: the v2 update has made many changes to how writing works on the SD Cards, the v2 update may install properly without any extra changes, however any benefits to SD Card longevity will not be applied without a re-install. Some elements on PieBoard may not work without the full re-install.
