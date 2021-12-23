import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import CallSmartContractHandler from "app/handler/callSmartContractHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(CallSmartContractHandler)
