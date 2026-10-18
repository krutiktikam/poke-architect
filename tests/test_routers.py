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
