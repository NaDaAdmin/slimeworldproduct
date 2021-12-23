import Response from "app/response"

async function UpdateSmartContractHandler(req, res) {

	const { contractId } = req.body
	const contractInfo = {
		contractId,
		newadmin_key,
		newmax_fee
	}


	const { hashgraphClient } = req.context
	const recvResponse = await hashgraphClient.updateSmartContract(contractInfo)

	if (recvResponse) {
		return Response.json(res, recvResponse)
	}


	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default UpdateSmartContractHandler
