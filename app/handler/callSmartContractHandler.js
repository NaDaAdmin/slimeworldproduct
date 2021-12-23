import Response from "app/response"

async function CallSmartContractHandler(req, res) {

	const { contractId, gas, memo, submemo } = req.body
	const contractInfo = {
		contractId,
		gas,
		memo,
		submemo
	}


	const { hashgraphClient } = req.context
	const recvResponse = await hashgraphClient.callSmartContract(contractInfo)

	if (recvResponse) {
		return Response.json(res, recvResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default CallSmartContractHandler
