package ico

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"testing"
)

func TestBuildSingleFrameICO(t *testing.T) {
	img := image.NewNRGBA(image.Rect(0, 0, 32, 24))
	for y := 0; y < 24; y++ {
		for x := 0; x < 32; x++ {
			img.SetNRGBA(x, y, color.NRGBA{R: byte(x * 8), G: byte(y * 8), B: 128, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	ico, err := BuildSingleFrameICO(buf.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if len(ico) < 40 {
		t.Fatalf("ico too small: %d", len(ico))
	}
	if ico[2] != 1 || ico[4] != 1 { // type icon, count 1 (little endian)
		t.Fatalf("bad header: %v", ico[:6])
	}
}

func TestEncodeFromPNGBlobs(t *testing.T) {
	_, err := EncodeFromPNGBlobs(nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestBuildICOFromPNG_multi(t *testing.T) {
	img := image.NewNRGBA(image.Rect(0, 0, 64, 64))
	for y := 0; y < 64; y++ {
		for x := 0; x < 64; x++ {
			img.SetNRGBA(x, y, color.NRGBA{R: 200, G: byte(x * 4), B: byte(y * 4), A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	ico, err := BuildICOFromPNG(buf.Bytes(), []int{16, 48})
	if err != nil {
		t.Fatal(err)
	}
	if len(ico) < 80 {
		t.Fatalf("ico too small: %d", len(ico))
	}
	// count = 2
	if ico[4] != 2 || ico[5] != 0 {
		t.Fatalf("want 2 frames, header: %v", ico[:6])
	}
}
