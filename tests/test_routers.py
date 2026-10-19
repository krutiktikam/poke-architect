from fastapi.testclient import TestClient


def test_get_moves_list(client: TestClient):
    response = client.get("/api/moves")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check shape
    move = data[0]
    assert "id" in move
    assert "name" in move
    assert "type" in move
    assert "pp" in move
    assert "damage_class" in move
    # Check ETag and Cache-Control headers
    assert "etag" in response.headers
    assert "cache-control" in response.headers


def test_get_moves_filtering(client: TestClient):
    # Filter by type
    res_type = client.get("/api/moves?type=Electric")
    assert res_type.status_code == 200
    moves = res_type.json()
    assert all(m["type"].lower() == "electric" for m in moves)

    # Filter by damage_class
    res_class = client.get("/api/moves?damage_class=special")
    assert res_class.status_code == 200
    moves_class = res_class.json()
    assert all(m["damage_class"].lower() == "special" for m in moves_class)


def test_get_moves_pagination(client: TestClient):
    res = client.get("/api/moves?limit=1&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1


def test_get_move_by_id(client: TestClient):
    response = client.get("/api/moves/85")
    assert response.status_code == 200
    move = response.json()
    assert move["id"] == 85
    assert move["name"].lower() == "thunderbolt"


def test_get_move_by_name(client: TestClient):
    # Case-insensitive lookup
    response = client.get("/api/moves/thunderbolt")
    assert response.status_code == 200
    move = response.json()
    assert move["id"] == 85

    response_caps = client.get("/api/moves/THUNDERBOLT")
    assert response_caps.status_code == 200
    assert response_caps.json()["id"] == 85


def test_get_move_not_found(client: TestClient):
    response = client.get("/api/moves/999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Move not found"

    res_str = client.get("/api/moves/nonexistentmovexyz")
    assert res_str.status_code == 404


def test_get_natures_list(client: TestClient):
    response = client.get("/api/natures")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check shape
    nature = data[0]
    assert "id" in nature
    assert "name" in nature
    assert "decreased_stat" in nature
    assert "increased_stat" in nature
    # Check ETag and Cache-Control headers
    assert "etag" in response.headers
    assert "cache-control" in response.headers


def test_get_natures_pagination(client: TestClient):
    res = client.get("/api/natures?limit=2&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert len(data) <= 2


def test_get_nature_by_id(client: TestClient):
    response = client.get("/api/natures/3")
    assert response.status_code == 200
    nature = response.json()
    assert nature["id"] == 3
    assert nature["name"].lower() == "adamant"


def test_get_nature_by_name(client: TestClient):
    # Case-insensitive lookup
    response = client.get("/api/natures/adamant")
    assert response.status_code == 200
    assert response.json()["id"] == 3

    response_caps = client.get("/api/natures/ADAMANT")
    assert response_caps.status_code == 200
    assert response_caps.json()["id"] == 3


def test_get_nature_not_found(client: TestClient):
    response = client.get("/api/natures/999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Nature not found"

    res_str = client.get("/api/natures/nonexistentnaturexyz")
    assert res_str.status_code == 404


def test_get_items_default_and_caching(client: TestClient):
    response = client.get("/api/items")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 4  # Master Ball, Leftovers, Life Orb, Potion
    # Check shape
    item = data[0]
    assert "id" in item
    assert "name" in item
    assert "is_holdable" in item
    # Check caching headers
    assert "etag" in response.headers
    assert "cache-control" in response.headers


def test_get_items_holdable_filter(client: TestClient):
    # Filter holdable=true
    res_holdable = client.get("/api/items?holdable=true")
    assert res_holdable.status_code == 200
    holdable_items = res_holdable.json()
    assert len(holdable_items) >= 2  # Leftovers, Life Orb
    assert all(i["is_holdable"] is True for i in holdable_items)
    holdable_names = [i["name"] for i in holdable_items]
    assert "Leftovers" in holdable_names
    assert "Life Orb" in holdable_names
    assert "Master Ball" not in holdable_names
    assert "Potion" not in holdable_names

    # Filter holdable=false
    res_non_holdable = client.get("/api/items?holdable=false")
    assert res_non_holdable.status_code == 200
    non_holdable_items = res_non_holdable.json()
    assert all(i["is_holdable"] is False for i in non_holdable_items)
    non_holdable_names = [i["name"] for i in non_holdable_items]
    assert "Master Ball" in non_holdable_names
    assert "Potion" in non_holdable_names
    assert "Leftovers" not in non_holdable_names


def test_get_items_sort_by_name(client: TestClient):
    response = client.get("/api/items?sort=name")
    assert response.status_code == 200
    data = response.json()
    names = [i["name"] for i in data]
    assert names == sorted(names)


def test_get_item_by_id_includes_is_holdable(client: TestClient):
    res_left = client.get("/api/items/211")
    assert res_left.status_code == 200
    assert res_left.json()["is_holdable"] is True

    res_mb = client.get("/api/items/1")
    assert res_mb.status_code == 200
    assert res_mb.json()["is_holdable"] is False


def test_get_item_pockets_includes_is_holdable(client: TestClient):
    response = client.get("/api/items/pockets")
    assert response.status_code == 200
    pockets = response.json()
    assert len(pockets) >= 1
    # Find all items inside categories
    pocket_items = [
        item
        for p in pockets
        for cat in p.get("categories", [])
        for item in cat.get("items", [])
    ]
    assert len(pocket_items) >= 1
    # Verify is_holdable field is present on every item
    for it in pocket_items:
        assert "is_holdable" in it
        assert isinstance(it["is_holdable"], bool)

    # Check specific items
    by_id = {it["id"]: it for it in pocket_items}
    if 211 in by_id:
        assert by_id[211]["is_holdable"] is True
    if 1 in by_id:
        assert by_id[1]["is_holdable"] is False

