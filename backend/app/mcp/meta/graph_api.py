import httpx

BASE_URL = "https://graph.facebook.com/v21.0"


async def get_user_pages(user_access_token: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/me/accounts",
            params={"access_token": user_access_token, "fields": "id,name,category,followers_count,access_token"},
        )
        resp.raise_for_status()
        return resp.json().get("data", [])


async def publish_post(page_access_token: str, page_id: str, message: str, image_url: str | None = None) -> dict:
    async with httpx.AsyncClient() as client:
        payload: dict = {"access_token": page_access_token, "message": message}
        if image_url:
            endpoint = f"{BASE_URL}/{page_id}/photos"
            payload["url"] = image_url
        else:
            endpoint = f"{BASE_URL}/{page_id}/feed"
        resp = await client.post(endpoint, data=payload)
        resp.raise_for_status()
        return resp.json()


async def schedule_post(page_access_token: str, page_id: str, message: str, publish_timestamp: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/{page_id}/feed",
            data={
                "access_token": page_access_token,
                "message": message,
                "published": "false",
                "scheduled_publish_time": publish_timestamp,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_post_comments(page_access_token: str, post_id: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/{post_id}/comments",
            params={"access_token": page_access_token, "fields": "id,message,from,created_time"},
        )
        resp.raise_for_status()
        return resp.json().get("data", [])


async def reply_to_comment(page_access_token: str, comment_id: str, message: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/{comment_id}/comments",
            data={"access_token": page_access_token, "message": message},
        )
        resp.raise_for_status()
        return resp.json()


async def get_page_insights(page_access_token: str, page_id: str, period: str = "day", days: int = 7) -> dict:
    metrics = "page_impressions,page_engaged_users,page_fans"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/{page_id}/insights",
            params={
                "access_token": page_access_token,
                "metric": metrics,
                "period": period,
                "date_preset": f"last_{days}_d" if days <= 28 else "last_28d",
            },
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        result: dict = {}
        for metric in data:
            name = metric["name"]
            values = metric.get("values", [])
            total = sum(v.get("value", 0) for v in values if isinstance(v.get("value"), int))
            result[name] = total
        return {
            "reach": result.get("page_impressions", 0),
            "engagement": result.get("page_engaged_users", 0),
            "followers": result.get("page_fans", 0),
        }


async def exchange_code_for_token(app_id: str, app_secret: str, redirect_uri: str, code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/oauth/access_token",
            params={
                "client_id": app_id,
                "client_secret": app_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_long_lived_token(app_id: str, app_secret: str, short_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": app_id,
                "client_secret": app_secret,
                "fb_exchange_token": short_token,
            },
        )
        resp.raise_for_status()
        return resp.json()
