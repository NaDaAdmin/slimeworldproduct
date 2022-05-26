import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import GetNFTMetaDataHandler from "app/handler/getNFTMetaDataHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(GetNFTMetaDataHandler)
