import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import GetSmartContractByteCodeHandler from "app/handler/getSmartContractByteCodeHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(GetSmartContractByteCodeHandler)
