package ico

import (
	"bytes"
	"encoding/binary"
	"errors"
	"image"
	"image/draw"
	"image/png"
	"math"
	"sort"

	xdraw "golang.org/x/image/draw"
)

// PngIHDRSize reads width/height from a standard PNG (signature + IHDR chunk first).
func PngIHDRSize(png []byte) (w, h int, err error) {
	const min = 8 + 8 + 13 // sig + chunk len/type + IHDR payload
	if len(png) < min {
		return 0, 0, errors.New("png too short")
	}
	if string(png[12:16]) != "IHDR" {
		return 0, 0, errors.New("missing IHDR")
	}
	w = int(binary.BigEndian.Uint32(png[16:20]))
	h = int(binary.BigEndian.Uint32(png[20:24]))
	if w <= 0 || h <= 0 {
		return 0, 0, errors.New("invalid dimensions")
	}
	return w, h, nil
}

// EncodeFromPNGBlobs merges standalone PNG file bytes into one Vista+ ICO.
func EncodeFromPNGBlobs(pngs [][]byte) ([]byte, error) {
	n := len(pngs)
	if n == 0 {
		return nil, errors.New("ico: no images")
	}
	headerSize := 6 + 16*n
	total := headerSize
	for _, p := range pngs {
		total += len(p)
	}
	out := make([]byte, total)
	le := binary.LittleEndian
	le.PutUint16(out[0:2], 0)
	le.PutUint16(out[2:4], 1)
	le.PutUint16(out[4:6], uint16(n))

	dataOff := headerSize
	dir := 6
	for _, png := range pngs {
		w, h, err := PngIHDRSize(png)
		if err != nil {
			return nil, err
		}
		bw, bh := byte(w), byte(h)
		if w >= 256 {
			bw = 0
		}
		if h >= 256 {
			bh = 0
		}
		out[dir] = bw
		out[dir+1] = bh
		out[dir+2] = 0
		out[dir+3] = 0
		le.PutUint16(out[dir+4:dir+6], 1)
		le.PutUint16(out[dir+6:dir+8], 32)
		le.PutUint32(out[dir+8:dir+12], uint32(len(png)))
		le.PutUint32(out[dir+12:dir+16], uint32(dataOff))
		dir += 16
		dataOff += len(png)
	}

	pos := headerSize
	for _, png := range pngs {
		copy(out[pos:], png)
		pos += len(png)
	}
	return out, nil
}

// RasterContainCopy scales src with "contain" into an s×s square, centered.
func RasterContainCopy(src image.Image, s int) *image.NRGBA {
	sw, sh := src.Bounds().Dx(), src.Bounds().Dy()
	if sw <= 0 || sh <= 0 || s <= 0 {
		return image.NewNRGBA(image.Rect(0, 0, maxInt(s, 0), maxInt(s, 0)))
	}
	scale := math.Min(float64(s)/float64(sw), float64(s)/float64(sh))
	dw := int(math.Max(1, math.Round(float64(sw)*scale)))
	dh := int(math.Max(1, math.Round(float64(sh)*scale)))
	dx := (s - dw) / 2
	dy := (s - dh) / 2

	dst := image.NewNRGBA(image.Rect(0, 0, s, s))
	dstBounds := image.Rect(dx, dy, dx+dw, dy+dh)
	xdraw.CatmullRom.Scale(dst, dstBounds, src, src.Bounds(), draw.Over, nil)
	return dst
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// EncodePNGBest encodes PNG at zlib best compression.
func EncodePNGBest(img image.Image) ([]byte, error) {
	var buf bytes.Buffer
	enc := png.Encoder{CompressionLevel: png.BestCompression}
	if err := enc.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func buildSingleFromImage(src image.Image) ([]byte, error) {
	b := src.Bounds()
	maxEdge := b.Dx()
	if b.Dy() > maxEdge {
		maxEdge = b.Dy()
	}
	s := maxEdge
	if s < 16 {
		s = 16
	}
	if s > 256 {
		s = 256
	}
	frame := RasterContainCopy(src, s)
	pngOut, err := EncodePNGBest(frame)
	if err != nil {
		return nil, err
	}
	return EncodeFromPNGBlobs([][]byte{pngOut})
}

// NormalizeSizes sorts unique edge lengths in [1,256].
func NormalizeSizes(sizes []int) []int {
	seen := make(map[int]struct{})
	out := make([]int, 0, len(sizes))
	for _, s := range sizes {
		if s < 1 || s > 256 {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	sort.Ints(out)
	return out
}

// BuildICOFromPNG decodes PNG; if sizes is empty, one auto frame (export edge clamped 16–256); else one frame per size (contain).
func BuildICOFromPNG(pngBytes []byte, sizes []int) ([]byte, error) {
	src, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return nil, err
	}
	sizes = NormalizeSizes(sizes)
	if len(sizes) == 0 {
		return buildSingleFromImage(src)
	}
	pngs := make([][]byte, 0, len(sizes))
	for _, s := range sizes {
		frame := RasterContainCopy(src, s)
		b, err := EncodePNGBest(frame)
		if err != nil {
			return nil, err
		}
		pngs = append(pngs, b)
	}
	return EncodeFromPNGBlobs(pngs)
}

// BuildSingleFrameICO decodes pngBytes, clamps frame edge to [16,256], single PNG-in-ICO.
func BuildSingleFrameICO(pngBytes []byte) ([]byte, error) {
	return BuildICOFromPNG(pngBytes, nil)
}
