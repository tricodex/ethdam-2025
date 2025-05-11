#!/bin/bash
oasis wallet import myaccount --secret "$(cat /src/temp_mnemonic.txt)" --algorithm secp256k1-bip44 --number 0
