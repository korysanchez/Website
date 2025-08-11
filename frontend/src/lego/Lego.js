import React, { useState, useEffect } from 'react';
import './Lego.css'; // Assuming you have a CSS file with the provided styles

// Utility component for displaying error messages
const ErrorMessage = ({ message }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (!isVisible) {
        return null;
    }

    return <div className="error">{message}</div>;
};


function buildImagePath(category, name) {
    if (!category || !name) {
        return '/part_images/placeholder.png';
    }

    const safeCategory = category.split('/')
        .map(part => part
            .replace(/°/g, 'deg')
            .replace(/⅓/g, '1_3')
            .replace(/⅔/g, '2_3')
            .replace(/\s+/g, '_')
        )
        .join('/');

    const safeName = name
        .replace(/°/g, 'deg')
        .replace(/⅓/g, '1_3')
        .replace(/⅔/g, '2_3')
        .replace(/\s+/g, '_');

    
    return `/part_images/${safeCategory}/${safeName}.png`;  // Removed leading /
}



// --- BOXES TAB COMPONENT ---
const BoxesTab = ({ setActiveTab, setSearchContainerId }) => {
    const [boxes, setBoxes] = useState([]);
    const [selectedBox, setSelectedBox] = useState('');
    const [boxContents, setBoxContents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/lego/api/boxes')
            .then(response => response.json())
            .then(data => {
                setBoxes(data);
            })
            .catch(err => {
                setError('Failed to load boxes. Please try again.');
            });
    }, []);

    const loadBoxContents = (boxId) => {
        if (!boxId) {
            setError('Please select a box.');
            return;
        }

        setLoading(true);
        setError('');
        fetch(`/lego/api/box/${boxId}`)
            .then(response => response.json())
            .then(data => {
                setBoxContents(data);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load box contents. Please try again.');
                setLoading(false);
            });
    };

    const handleBoxSelect = (e) => {
        setSelectedBox(e.target.value);
    };

    const handleNextBox = () => {
        const currentIndex = boxes.indexOf(selectedBox);
        if (currentIndex < boxes.length - 1) {
            const nextBoxId = boxes[currentIndex + 1];
            setSelectedBox(nextBoxId);
            loadBoxContents(nextBoxId);
        }
    };

    const handlePrevBox = () => {
        const currentIndex = boxes.indexOf(selectedBox);
        if (currentIndex > 0) {
            const prevBoxId = boxes[currentIndex - 1];
            setSelectedBox(prevBoxId);
            loadBoxContents(prevBoxId);
        }
    };

    const formatPositionCell = (position, pieces) => {
        const hasPieces = pieces && pieces.length > 0;
        const containerId = hasPieces ? pieces[0].container_id : 'Empty';

        
        
        const pieceImages = hasPieces ? pieces.slice(0, 5).map((piece, index) => {
            const imagePath = buildImagePath(piece.category, piece.name);
            return (
                <img
                    key={index}
                    src={imagePath}
                    alt={piece.name || 'Unknown'}
                    title={`[${piece.part_number}] ${piece.name} | ${piece.category}`}
                    style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain', margin: '0px 10px' }}
                    onError={(e) => console.log(`Failed to load: ${e.target.src}`)}
                />
            );
        }) : null;

        const morePieces = hasPieces && pieces.length > 5;

        return (
            <div
                className="container_card"
                onClick={() => {
                    if (hasPieces) {
                        setSearchContainerId(containerId);
                        setActiveTab('containers');
                    }
                }}
            >
                <div><strong>{position} ({containerId})</strong></div>
                <div className="piece-card" style={{ padding: '5px', margin: '5px 0', display: 'flex', flexWrap: 'nowrap', overflowX: 'hidden' }}>
                    {pieceImages || 'Empty'}
                    {morePieces && <div>+{pieces.length - 5} more</div>}
                </div>
            </div>
        );
    };

    const renderBoxTable = () => {
        if (loading) return <p>Loading...</p>;
        if (boxContents.length === 0) return null;

        const allPositions = "0123456789ABCDEF".split('');
        const leftPositions = allPositions.slice(0, 8);
        const rightPositions = allPositions.slice(8);
        const tableRows = [];

        for (let i = 0; i < 8; i++) {
            const posLeft = leftPositions[i];
            const piecesLeft = boxContents.filter(item => item.position?.toUpperCase() === posLeft);
            const posRight = rightPositions[i];
            const piecesRight = boxContents.filter(item => item.position?.toUpperCase() === posRight);

            tableRows.push(
                <tr key={i}>
                    <td>{formatPositionCell(posLeft, piecesLeft)}</td>
                    <td>{formatPositionCell(posRight, piecesRight)}</td>
                </tr>
            );
        }

        return (
            <div id="box-details">
                <h3 id="box-title">Box {selectedBox} Contents</h3>
                <table id="box-contents">
                    <thead>
                        <tr>
                            <th>Position</th>
                            <th>Position</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableRows}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div id="tab-boxes" className="tab-content active">
            <div className="card-header">Box Overview</div>
            <p>Select a box to view its contents:</p>
            <div className="search-bar">
                <button id="prev-box" title="Previous Box" onClick={handlePrevBox}>←</button>
                <select id="box-selector" value={selectedBox} onChange={handleBoxSelect}>
                    <option value="">Select a box...</option>
                    {boxes.map(box => (
                        <option key={box} value={box}>Box {box}</option>
                    ))}
                </select>
                <button id="load-box" onClick={() => loadBoxContents(selectedBox)}>Load Box</button>
                <button id="next-box" title="Next Box" onClick={handleNextBox}>→</button>
            </div>
            <ErrorMessage message={error} />
            {renderBoxTable()}
        </div>
    );
};

// --- CONTAINERS TAB COMPONENT ---
const ContainersTab = ({ initialSearchId = '' }) => {
    const [containerId, setContainerId] = useState(initialSearchId);
    const [containerDetails, setContainerDetails] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialSearchId) {
            setContainerId(initialSearchId);
            searchContainer(initialSearchId);
        }
    }, [initialSearchId]);

    const searchContainer = (id) => {
        if (!id) {
            setError('Please enter a container ID.');
            return;
        }

        setLoading(true);
        setContainerDetails(null);
        setError('');
        fetch(`/lego/api/container/${id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Container not found');
                }
                return response.json();
            })
            .then(data => {
                setContainerDetails(data);
                setLoading(false);
            })
            .catch(err => {
                setError('Container not found. Please check the ID and try again.');
                setLoading(false);
            });
    };

    return (
        <div id="tab-containers" className="tab-content">
            <div className="card-header">Container Search</div>
            <div className="search-bar">
                <input
                    type="text"
                    id="container-search"
                    placeholder="Enter container ID (e.g., c001)"
                    value={containerId}
                    onChange={(e) => setContainerId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchContainer(containerId)}
                />
                <button id="search-container" onClick={() => searchContainer(containerId)}>Search</button>
            </div>
            <ErrorMessage message={error} />
            {loading && <p>Loading...</p>}
            {containerDetails && (
                <div id="container-details">
                    <div className="card-header">Container Information</div>
                    <p><strong>ID:</strong> <span id="container-id">{containerDetails.id}</span></p>
                    <p><strong>Location:</strong> <span id="container-location">
                        {containerDetails.location?.box ? `Box ${containerDetails.location.box}, Position ${containerDetails.location.position.toUpperCase()}` : 'Not assigned to a location'}
                    </span></p>
                    <p><strong>Pieces:</strong> <span id="container-piece-count">
                        {containerDetails.pieces.length === 1 ? '1 piece' : `${containerDetails.pieces.length} pieces`}
                    </span></p>
                    <table id="container-pieces">
                        <thead>
                            <tr>
                                <th>Part Number</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Image</th>
                            </tr>
                        </thead>
                        <tbody>
                            {containerDetails.pieces.map((piece, index) => (
                                <tr key={index}>
                                    <td>{piece.part_number}</td>
                                    <td>{piece.name || 'Unknown'}</td>
                                    <td>{piece.category || 'Unknown'}</td>
                                    <td>
                                        <img
                                            src={buildImagePath(piece.category, piece.name)}alt={piece.name || 'Unknown'}
                                            style={{ maxWidth: '250px', maxHeight: '150px', objectFit: 'contain' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- PIECES TAB COMPONENT ---
const PiecesTab = ({ setActiveTab, setSearchContainerId }) => {
    const [searchType, setSearchType] = useState('name');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (searchType === 'category' && categories.length === 0) {
            fetch('/lego/api/categories')
                .then(response => response.json())
                .then(data => setCategories(data))
                .catch(err => console.error('Error fetching categories:', err));
        }
    }, [searchType, categories]);

    const searchPieces = () => {
        let termToSearch = '';
        if (searchType === 'category') {
            termToSearch = selectedCategory;
            if (!termToSearch) {
                setError('Please select a category.');
                return;
            }
        } else {
            termToSearch = searchTerm.trim();
            if (!termToSearch) {
                setError('Please enter a search term.');
                return;
            }
        }
        
        setLoading(true);
        setResults([]);
        setError('');

        fetch(`/lego/api/piece/search?type=${searchType}&term=${encodeURIComponent(termToSearch)}`)
            .then(response => response.json())
            .then(data => {
                setResults(data);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to search pieces. Please try again.');
                setLoading(false);
            });
    };

    return (
        <div id="tab-pieces" className="tab-content">
            <div className="card">
                <div className="card-header">Piece Search</div>
                <div className="search-bar">
                    <select id="search-type" value={searchType} onChange={(e) => setSearchType(e.target.value)}>
                        <option value="name">Name</option>
                        <option value="part_number">Part Number</option>
                        <option value="category">Category</option>
                    </select>
                    {searchType === 'category' ? (
                        <select
                            id="category-select"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Select a category...</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            id="piece-search"
                            placeholder="Enter search term"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchPieces()}
                        />
                    )}
                    <button id="search-piece" onClick={searchPieces}>Search</button>
                </div>
                <ErrorMessage message={error} />
                {loading && <p>Loading...</p>}
                <div id="piece-results" className="grid">
                    {results.length === 0 && !loading && <p>No pieces found matching your search.</p>}
                    {results.map(piece => (
                        <div key={piece.part_number} className="card">
                            <div className="card-header">{piece.name || 'Unknown Piece'}</div>
                            <p><strong>Part Number:</strong> {piece.part_number}</p>
                            <p><strong>Category:</strong> {piece.category || 'Unknown'}</p>
                            <img
                                src={buildImagePath(piece.category, piece.name)}
                                alt={piece.name || 'Unknown'}
                                style={{ maxWidth: '250px', maxHeight: '150px', objectFit: 'contain' }}
                            />
                            <p><strong>Found in:</strong></p>
                            {piece.containers && piece.containers.length > 0 ? (
                                <div>
                                    {piece.containers.map((container, index) => (
                                        <div key={index} style={{ marginBottom: '4px' }}>
                                            <a href="#" onClick={(e) => {
                                                e.preventDefault();
                                                setSearchContainerId(container.container_id);
                                                setActiveTab('containers');
                                            }}>
                                                {container.container_id}
                                            </a>
                                            {container.location ? ` (${container.location})` : ' (no location assigned)'}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>Not found in any container</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App = () => {
    const [activeTab, setActiveTab] = useState('boxes');
    const [searchContainerId, setSearchContainerId] = useState('');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'boxes':
                return <BoxesTab setActiveTab={setActiveTab} setSearchContainerId={setSearchContainerId} />;
            case 'containers':
                return <ContainersTab initialSearchId={searchContainerId} />;
            case 'pieces':
                return <PiecesTab setActiveTab={setActiveTab} setSearchContainerId={setSearchContainerId} />;
            default:
                return null;
        }
    };

    return (
        <>
            <header>
                <h1 id="lego-header">LEGO Collection Viewer</h1>
            </header>
            <div className="container">
                <div className="tabs">
                    <button className={`tab ${activeTab === 'boxes' ? 'active' : ''}`} onClick={() => setActiveTab('boxes')}>Boxes</button>
                    <button className={`tab ${activeTab === 'containers' ? 'active' : ''}`} onClick={() => setActiveTab('containers')}>Containers</button>
                    <button className={`tab ${activeTab === 'pieces' ? 'active' : ''}`} onClick={() => setActiveTab('pieces')}>Pieces</button>
                </div>
                {renderTabContent()}
            </div>
        </>
    );
};

export default App;