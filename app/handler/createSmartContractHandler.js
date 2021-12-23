import createSmartContract from "app/validators/createSmartContract"
import Response from "app/response"

async function CreateSmartContractHandler(req, res) {

	const validationErrors = createSmartContract(req.body)

	if (validationErrors) {
		return Response.unprocessibleEntity(res, validationErrors)
	}

	const { encrypted_receiver_key, gas, file_memo } = req.body
	const contractInfo = {
		encrypted_receiver_key,
		gas,
		file_memo
	}
	const { hashgraphClient } = req.context
	const recvResponse = await hashgraphClient.createSmartContract(contractInfo)

	if (recvResponse) {
		return Response.json(res, recvResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default CreateSmartContractHandler
