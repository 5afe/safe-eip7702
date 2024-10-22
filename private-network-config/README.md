
# EIP-7702: Ethereum Private Network Config

## Run the private network
```sh
kurtosis run github.com/ethpandaops/ethereum-package \
--enclave ethereum-private-network \
--args-file ./network_params.yaml \
--image-download always
```

## Export the genesis data
```sh
kurtosis files download ethereum-private-network el_cl_genesis_data ./data/network-config
```

## Stop and remove the private network
```sh
kurtosis clean -a
```

## View the logs
```sh
kurtosis service logs ethereum-private-network -f
```