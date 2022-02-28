import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import StakingTokenHandler from "app/handler/stakingTokenHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(StakingTokenHandler)
