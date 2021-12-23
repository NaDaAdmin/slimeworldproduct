import Response from "app/response"

async function GetSmartContractByteCodeHandler(req, res) {

	const { contact_id, gas, function_name } = req.body
	const contractInfo = {
		contact_id,
		gas,
		function_name
	}
	const { hashgraphClient } = req.context
	const recvResponse = await hashgraphClient.getSmartContractFuction(contractInfo)

	if (recvResponse) {
		return Response.json(res, recvResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default GetSmartContractByteCodeHandler
