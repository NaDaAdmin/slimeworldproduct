import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import GetSmartContractFunctionHandler from "app/handler/getSmartContractFunctionHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(GetSmartContractFunctionHandler)
