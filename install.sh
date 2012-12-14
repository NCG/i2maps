#!/bin/bash

echo "Preparing to install i2map dependencies"
echo "Installing pico"
wget https://github.com/fergalwalsh/pico/archive/master.zip
unzip master.zip
cd pico-master
sudo python setup.py install
cd ..
rm -r -f pico-master
rm master.zip
echo "Installing python setup tools"
sudo apt-get install python-setuptools
echo "Installing Django"
sudo apt-get install python-django
echo "Installing GEOS"
wget http://download.osgeo.org/geos/geos-3.3.6.tar.bz2
tar xvf geos-3.3.6.tar.bz2
cd geos-3.3.6
sudo ./configure
sudo make
sudo make install
cd ..
rm -r -f geos-3.3.6*
echo "Installing GDAL"
sudo apt-get install python-gdal
echo "Installing PROJ.4"
wget http://download.osgeo.org/proj/proj-4.8.0.tar.gz
tar -zvxf proj-4.8.0.tar.gz
cd proj-4.8.0
sudo ./configure
sudo make
sudo make install
cd ..
rm -r -f proj-4.8.0*
echo "Installing Numpy"
sudo apt-get install python-numpy
echo "Installing Psycopg2"
sudo apt-get install python-psycopg2
