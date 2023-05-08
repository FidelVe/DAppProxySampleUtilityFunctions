curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest", false],"id":1}' https://server03.espanicon.team

curl --silent -X POST --data '{"jsonrpc":"2.0","method":"icx_call","id":121,"params":{"to":"cx0000000000000000000000000000000000000000","dataType":"call","data":{"method":"getPReps"}}}' https://server02.espanicon.team/api/v3
