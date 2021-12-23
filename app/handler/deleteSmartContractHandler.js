import Response from "app/response"

async function DeleteSmartContractHandler(req, res) {

	const { contractId, admin_key } = req.body
	const contractInfo = {
		contractId,
		admin_key
	}


	const { hashgraphClient } = req.context
	const recvResponse = await hashgraphClient.deleteSmartContract(contractInfo)

	if (recvResponse) {
		return Response.json(res, recvResponse)
	}


	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default DeleteSmartContractHandler
