import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import FreezeTokenHandler from "app/handler/freezeTokenHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(FreezeTokenHandler)
