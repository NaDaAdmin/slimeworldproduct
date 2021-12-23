import Response from "app/response"

async function GetSmartContractByteCodeHandler(req, res) {

	const { contact_id } = req.body
	const contractInfo = {
		contact_id
	}
	const { hashgraphClient } = req.context
	const recvResponse = await hashgraphClient.getSmartContractByteCode(contractInfo)

	if (recvResponse) {
		return Response.json(res, recvResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default GetSmartContractByteCodeHandler
